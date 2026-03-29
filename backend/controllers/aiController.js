const { getDashboardSnapshot } = require('../lib/dashboardSnapshot');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const safeArray = (value) => (Array.isArray(value) ? value : []);

function buildSnapshotDigest(snapshot) {
  return {
    mode: snapshot.mode,
    connections: safeArray(snapshot.connections).map((connection) => ({
      provider: connection.provider,
      metadata: connection.metadata ?? {},
      createdAt: connection.created_at,
    })),
    issues: safeArray(snapshot.issues).slice(0, 8).map((issue) => ({
      id: issue.id,
      title: issue.title,
      priority: issue.priority,
      trend: issue.trend,
      trendPercent: issue.trendPercent,
      reportCount: issue.reportCount,
      sources: issue.sources,
      summary: issue.summary,
      suggestedActions: issue.suggestedActions ?? [],
    })),
    feedback: safeArray(snapshot.feedback).slice(0, 10).map((item) => ({
      source: item.source,
      author: item.author,
      sentiment: item.sentiment,
      text: item.text,
      timestamp: item.timestamp,
    })),
    timeline: safeArray(snapshot.timeline).slice(-20),
  };
}

async function groqJsonRequest(messages) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY on the backend.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Groq request failed.');
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Groq returned an empty response.');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Groq returned invalid JSON.');
  }
}

async function chatWithAssistant(req, res) {
  try {
    const message = (
      req.body?.message ??
      req.body?.prompt ??
      req.body?.question ??
      ''
    ).trim();

    if (!message) {
      return res.json({
        answer:
          'Ask me something like "What should I fix first?", "What is trending?", or "Which team should act now?" and I will use your live Product Pulse data to answer.',
        suggestedActions: [
          'Ask which issue has the highest founder priority.',
          'Ask what changed most in the latest feedback.',
          'Ask which team should act first and why.',
        ],
        suggestedIssueIds: [],
        confidence: 'high',
        generatedAt: new Date().toISOString(),
        model: DEFAULT_MODEL,
        snapshotMode: 'real',
      });
    }

    const snapshot = await getDashboardSnapshot(req.user);
    const digest = buildSnapshotDigest(snapshot);

    const parsed = await groqJsonRequest([
      {
        role: 'system',
        content: [
          'You are Product Pulse AI Helper.',
          'Answer as a real-time product operations copilot for the signed-in founder.',
          'Use the live database snapshot as ground truth.',
          'Be practical, concise, and action-oriented.',
          'Return JSON only.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          'Return strict JSON with this shape:',
          '{"answer":"string","suggestedActions":["string","string","string"],"suggestedIssueIds":["string"],"confidence":"high|medium|low"}',
          `Live snapshot: ${JSON.stringify(digest)}`,
          `Founder question: ${message}`,
        ].join('\n'),
      },
    ]);

    return res.json({
      answer: parsed.answer ?? 'I could not produce an answer from the current snapshot.',
      suggestedActions: safeArray(parsed.suggestedActions).slice(0, 3),
      suggestedIssueIds: safeArray(parsed.suggestedIssueIds).slice(0, 5),
      confidence: parsed.confidence ?? 'medium',
      generatedAt: new Date().toISOString(),
      model: DEFAULT_MODEL,
      snapshotMode: snapshot.mode,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate AI chat response.',
    });
  }
}

module.exports = {
  chatWithAssistant,
};
