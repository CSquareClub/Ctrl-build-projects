const { createTwoFilesPatch } = require('diff');
const { groqJsonRequest } = require('../lib/groqFeedbackClassifier');

const TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 1000 * 60 * 10;
const reasoningCache = new Map();

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSeverity(value, fallback = 'medium') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return fallback;
}

function getCache(key) {
  const entry = reasoningCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    reasoningCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  reasoningCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function offsetPatchHunks(patch, startLine) {
  const offset = Math.max(0, Number(startLine || 1) - 1);
  return String(patch || '').replace(
    /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm,
    (_, oldStart, oldCount = '1', newStart, newCount = '1') => {
      const nextOld = Number(oldStart) + offset;
      const nextNew = Number(newStart) + offset;
      return `@@ -${nextOld},${oldCount} +${nextNew},${newCount} @@`;
    }
  );
}

function buildFallbackFileFinding(file, ast) {
  const riskyNode = ast?.riskyNodes?.[0];
  return {
    path: file.path,
    severity: riskyNode?.type?.includes('async-call') ? 'medium' : 'low',
    reason: riskyNode
      ? `Potential issue around ${riskyNode.type} in this file.`
      : `This file is relevant because it matches the issue context.`,
    rootCauseRole: file.filePurpose || 'supporting logic',
    flowTo: [],
    updatedSnippet: file.snippet,
    confidence: 0.56,
  };
}

function buildFallbackReasoning(context) {
  const fileFindings = context.files.map((file) => {
    const ast = context.files.find((entry) => entry.path === file.path);
    return buildFallbackFileFinding(file, ast);
  });

  return {
    rootCause: 'Cross-file issue likely spans the matched UI, API, or state flow files.',
    flowSummary: 'AgenticPulse matched a small set of files that appear to participate in the reported issue path.',
    recommendations: [
      'Review async boundaries across the selected files.',
      'Check state and API handoff between the top two matched files.',
      'Apply minimal guarded fixes before broad refactors.',
    ],
    fileFindings,
    llmFallback: true,
    llmTimedOut: false,
  };
}

async function runGroqMultiFile(context) {
  if (!process.env.GROQ_API_KEY) {
    return buildFallbackReasoning(context);
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timed out')), TIMEOUT_MS)
  );

  try {
    const parsed = await Promise.race([
      groqJsonRequest([
        {
          role: 'system',
          content: [
            'You analyze cross-file JavaScript issues.',
            'Return strict JSON only with keys rootCause, flowSummary, recommendations, fileFindings, confidence.',
            'fileFindings must be an array of { path, severity, reason, rootCauseRole, flowTo, updatedSnippet, confidence }.',
            'Make minimal multi-file fixes and only update snippets when confident.',
            'Do not invent files outside the provided set.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify(context),
        },
      ]),
      timeoutPromise,
    ]);

    const fileFindings = Array.isArray(parsed?.fileFindings)
      ? parsed.fileFindings
          .map((entry) => ({
            path: String(entry?.path || '').trim(),
            severity: normalizeSeverity(entry?.severity),
            reason: String(entry?.reason || '').trim(),
            rootCauseRole: String(entry?.rootCauseRole || '').trim(),
            flowTo: Array.isArray(entry?.flowTo)
              ? entry.flowTo.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
              : [],
            updatedSnippet: String(entry?.updatedSnippet || '').trim(),
            confidence: clamp(Number(entry?.confidence || 0.7)),
          }))
          .filter((entry) => entry.path)
      : [];

    return {
      rootCause: String(parsed?.rootCause || '').trim() || 'Cross-file root cause not identified clearly.',
      flowSummary: String(parsed?.flowSummary || '').trim() || 'Cross-file flow summary unavailable.',
      recommendations: Array.isArray(parsed?.recommendations)
        ? parsed.recommendations.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6)
        : [],
      fileFindings,
      llmConfidence: clamp(Number(parsed?.confidence || 0.74)),
      llmFallback: false,
      llmTimedOut: false,
    };
  } catch (error) {
    const fallback = buildFallbackReasoning(context);
    return {
      ...fallback,
      llmTimedOut: String(error?.message || '').includes('Timed out'),
    };
  }
}

function buildCombinedPatch(context, fileFindings) {
  const patches = [];
  const patchFiles = [];

  for (const file of context.files) {
    const finding = fileFindings.find((entry) => entry.path === file.path);
    if (!finding || !finding.updatedSnippet || finding.updatedSnippet === file.snippet) {
      continue;
    }

    const rawPatch = createTwoFilesPatch(
      file.path,
      file.path,
      file.snippet,
      finding.updatedSnippet,
      'original',
      'updated'
    );
    const adjustedPatch = offsetPatchHunks(rawPatch, file.snippetStartLine || file.startLine || 1);
    patches.push(adjustedPatch.trim());
    patchFiles.push({
      path: file.path,
      originalSnippet: file.snippet,
      updatedSnippet: finding.updatedSnippet,
      patch: adjustedPatch,
      severity: finding.severity,
      reason: finding.reason,
    });
  }

  return {
    patch: patches.join('\n\n'),
    patchFiles,
  };
}

function computeConfidence(astSummary, reasoning) {
  const riskyCount = astSummary.reduce((sum, file) => sum + (file.riskyNodes?.length || 0), 0);
  const astScore = clamp(riskyCount / Math.max(astSummary.length * 4, 1));
  const llmScore = reasoning.llmFallback ? 0.45 : clamp(reasoning.llmConfidence || 0.74);
  const consistentFiles = reasoning.fileFindings.filter((finding) =>
    astSummary.some((file) => file.path === finding.path)
  ).length;
  const consistency = clamp(consistentFiles / Math.max(astSummary.length, 1));
  return clamp(0.4 * astScore + 0.35 * llmScore + 0.25 * consistency);
}

async function analyzeMultiFileContext(context, astSummary) {
  const cacheKey = JSON.stringify({
    issueId: context.issue.id,
    files: context.files.map((file) => `${file.path}:${file.snippetStartLine}-${file.snippetEndLine}`),
  });
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const reasoning = await runGroqMultiFile(context);
  const fileFindings =
    reasoning.fileFindings.length > 0
      ? context.files.map((file) => {
          const match = reasoning.fileFindings.find((entry) => entry.path === file.path);
          return match || buildFallbackFileFinding(file, astSummary.find((entry) => entry.path === file.path));
        })
      : context.files.map((file) =>
          buildFallbackFileFinding(file, astSummary.find((entry) => entry.path === file.path))
        );

  const patchResult = buildCombinedPatch(context, fileFindings);
  const confidence = computeConfidence(astSummary, {
    ...reasoning,
    fileFindings,
  });

  const result = {
    issue: context.issue,
    repository: context.repository,
    rootCause: reasoning.rootCause,
    flowSummary: reasoning.flowSummary,
    recommendations: reasoning.recommendations,
    files: context.files.map((file) => {
      const ast = astSummary.find((entry) => entry.path === file.path);
      const finding = fileFindings.find((entry) => entry.path === file.path);
      return {
        path: file.path,
        filePurpose: file.filePurpose,
        matchStrength: file.matchStrength,
        matchedKeyword: file.matchedKeyword,
        snippet: file.snippet,
        startLine: file.snippetStartLine || file.startLine,
        endLine: file.snippetEndLine || file.endLine,
        imports: ast?.imports || [],
        functions: ast?.functions || [],
        riskyNodes: ast?.riskyNodes || [],
        finding,
      };
    }),
    patch: patchResult.patch,
    patchFiles: patchResult.patchFiles,
    confidence: Number(confidence.toFixed(2)),
    meta: {
      llmFallback: reasoning.llmFallback,
      llmTimedOut: reasoning.llmTimedOut,
      fileCount: context.files.length,
    },
  };

  setCache(cacheKey, result);
  return result;
}

module.exports = {
  analyzeMultiFileContext,
};
