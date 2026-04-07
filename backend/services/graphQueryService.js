const { groqJsonRequest } = require('../lib/groqFeedbackClassifier');

function detectIntent(question) {
  const normalized = String(question || '').toLowerCase();
  if (/root cause|origin|starting point|why|where did it start/.test(normalized)) return 'root_cause';
  if (/impact|affected|blast radius|downstream|what breaks|who is affected/.test(normalized)) return 'impact';
  if (/critical path|path|flow|sequence|route/.test(normalized)) return 'critical_path';
  if (/depend|import|relationship|connected|linked|coupled/.test(normalized)) return 'dependencies';
  return 'overview';
}

function collectFocus(intent, graphData) {
  const issueNode = graphData.nodes.find((node) => node.type === 'issue');
  const rootNode = graphData.nodes.find((node) => node.rootCause && node.type === 'file');
  const affectedNodes = graphData.nodes.filter((node) => node.affected);
  const importEdges = graphData.edges.filter((edge) => edge.type === 'import');
  const flowEdges = graphData.edges.filter((edge) => edge.type === 'issue-flow' || edge.type === 'root-cause');

  switch (intent) {
    case 'root_cause':
      return {
        nodeIds: [issueNode?.id, rootNode?.id].filter(Boolean),
        edgeIds: flowEdges.filter((edge) => edge.active).map((edge) => edge.id),
      };
    case 'impact':
      return {
        nodeIds: [issueNode?.id, rootNode?.id, ...affectedNodes.map((node) => node.id)].filter(Boolean),
        edgeIds: flowEdges.map((edge) => edge.id),
      };
    case 'dependencies':
      return {
        nodeIds: graphData.nodes.filter((node) => node.type === 'file').map((node) => node.id),
        edgeIds: importEdges.map((edge) => edge.id),
      };
    case 'critical_path':
      return {
        nodeIds: [issueNode?.id, rootNode?.id, ...affectedNodes.map((node) => node.id)].filter(Boolean),
        edgeIds: flowEdges.map((edge) => edge.id),
      };
    default:
      return {
        nodeIds: graphData.nodes.map((node) => node.id),
        edgeIds: graphData.edges.map((edge) => edge.id),
      };
  }
}

function buildFallbackExplanation(intent, analysis, focus) {
  switch (intent) {
    case 'root_cause':
      return `The root cause appears to start in ${focus.nodeIds[1]?.replace('file:', '') || 'the top-ranked file'}, then propagate outward from the issue node.`;
    case 'impact':
      return `The issue affects ${Math.max(0, focus.nodeIds.length - 1)} connected file nodes, with the highlighted path showing where the impact spreads after the origin.`;
    case 'dependencies':
      return `The highlighted graph shows import relationships across the selected files, so you can see which files depend on one another before applying a patch.`;
    case 'critical_path':
      return `The critical path starts at the issue node, moves into the likely root-cause file, and then follows the active flow edges into affected files.`;
    default:
      return `This graph combines issue, file dependency, and propagation signals so you can inspect the likely cause and blast radius quickly.`;
  }
}

function buildGraphAction(intent, focus) {
  return {
    mode:
      intent === 'root_cause' || intent === 'critical_path'
        ? 'path'
        : intent === 'dependencies'
          ? 'dependencies'
          : 'focus',
    zoomNodeId: focus.nodeIds[0] || null,
    animatePath: intent === 'root_cause' || intent === 'critical_path' || intent === 'impact',
  };
}

async function answerGraphQuestion({ question, analysis, graphData }) {
  const intent = detectIntent(question);
  const focus = collectFocus(intent, graphData);

  if (!process.env.GROQ_API_KEY) {
    return {
      intent,
      explanation: buildFallbackExplanation(intent, analysis, focus),
      focus,
      reasoning: ['Rule-based graph navigation fallback is active.'],
      graphAction: buildGraphAction(intent, focus),
    };
  }

  try {
    const parsed = await groqJsonRequest([
      {
        role: 'system',
        content: [
          'You explain software dependency graphs for developers.',
          'Return strict JSON with keys explanation, reasoning, recommendedFocus, graphAction.',
          'Keep answers concise, clear, and aligned to the provided graph and issue context.',
          'graphAction must be an object with mode, zoomNodeId, animatePath.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          intent,
          issue: analysis.issue,
          rootCause: analysis.rootCause,
          flowSummary: analysis.flowSummary,
          files: analysis.files.map((file) => ({
            path: file.path,
            purpose: file.filePurpose,
            role: file.finding?.rootCauseRole,
            flowTo: file.finding?.flowTo || [],
          })),
          focus,
        }),
      },
    ]);

    return {
      intent,
      explanation: String(parsed?.explanation || '').trim() || buildFallbackExplanation(intent, analysis, focus),
      reasoning: Array.isArray(parsed?.reasoning)
        ? parsed.reasoning.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
        : [],
      focus: {
        nodeIds: Array.isArray(parsed?.recommendedFocus?.nodeIds)
          ? parsed.recommendedFocus.nodeIds.filter(Boolean)
          : focus.nodeIds,
        edgeIds: Array.isArray(parsed?.recommendedFocus?.edgeIds)
          ? parsed.recommendedFocus.edgeIds.filter(Boolean)
          : focus.edgeIds,
      },
      graphAction: {
        mode: String(parsed?.graphAction?.mode || '').trim() || buildGraphAction(intent, focus).mode,
        zoomNodeId:
          String(parsed?.graphAction?.zoomNodeId || '').trim() || buildGraphAction(intent, focus).zoomNodeId,
        animatePath:
          typeof parsed?.graphAction?.animatePath === 'boolean'
            ? parsed.graphAction.animatePath
            : buildGraphAction(intent, focus).animatePath,
      },
    };
  } catch {
    return {
      intent,
      explanation: buildFallbackExplanation(intent, analysis, focus),
      reasoning: ['Using deterministic graph navigation because AI reasoning was unavailable.'],
      focus,
      graphAction: buildGraphAction(intent, focus),
    };
  }
}

module.exports = {
  detectIntent,
  answerGraphQuestion,
};
