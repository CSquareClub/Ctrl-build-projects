const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const PATCH_CACHE_TTL_MS = 1000 * 60 * 10;
const patchCache = new Map();
const { buildGroqCodeContext } = require('./groqCodeContextService');

function getCacheValue(key) {
  const entry = patchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    patchCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCacheValue(key, value) {
  patchCache.set(key, {
    value,
    expiresAt: Date.now() + PATCH_CACHE_TTL_MS,
  });
}

function createCacheKey(issue, files, issueIntelligence = null) {
  return JSON.stringify({
    issueId: issue.id || issue.title,
    title: issue.title,
    files: files.map((file) => `${file.path}:${file.sha || ''}:${file.startLine}-${file.endLine}`),
    intelligence: issueIntelligence
      ? {
          severity: issueIntelligence.severity,
          frequency: issueIntelligence.frequency,
          page: issueIntelligence.probable_context?.page || null,
          api: issueIntelligence.probable_context?.api || null,
          component: issueIntelligence.probable_context?.component_hint || null,
        }
      : null,
  });
}

function extractDiffBlock(text) {
  const content = String(text || '');
  const fencedMatch = content.match(/```diff\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const fallbackMatch = content.match(/(?:^|\n)(diff --git[\s\S]*|--- [\s\S]*)$/);
  return fallbackMatch ? fallbackMatch[1].trim() : '';
}

async function callGroq(messages, options = {}) {
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
      temperature: options.temperature ?? 0.15,
      response_format: options.responseFormat || { type: 'json_object' },
      messages,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to generate with Groq.');
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned an empty response.');
  }

  return content;
}

function toPercent(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  if (numeric <= 1) {
    return Math.max(0, Math.min(100, Number((numeric * 100).toFixed(1))));
  }
  return Math.max(0, Math.min(100, Number(numeric.toFixed(1))));
}

function normalizePossibleCauses(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback ? [fallback] : [];
  }

  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeAlternativeFixes(value, patch, targetFiles) {
  const alternatives = Array.isArray(value) ? value : [];
  const normalized = alternatives
    .map((entry, index) => {
      const title = String(entry?.title || `Option ${index + 1}`).trim();
      const summary = String(entry?.summary || '').trim();
      const pros = Array.isArray(entry?.pros)
        ? entry.pros.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
        : [];
      const cons = Array.isArray(entry?.cons)
        ? entry.cons.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
        : [];
      const rank = Number(entry?.rank || index + 1);
      const recommended = Boolean(entry?.recommended) || rank === 1;

      if (!title || !summary) {
        return null;
      }

      return {
        title,
        summary,
        pros,
        cons,
        rank: Number.isFinite(rank) ? rank : index + 1,
        recommended,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 3);

  if (normalized.length > 0) {
    if (!normalized.some((entry) => entry.recommended)) {
      normalized[0].recommended = true;
    }
    return normalized;
  }

  return [
    {
      title: 'Recommended minimal patch',
      summary: `Apply the targeted diff in ${targetFiles?.[0] || 'the matched file'} and keep the fix scoped to the reported issue.`,
      pros: ['Small change surface', 'Fast to review'],
      cons: ['May need follow-up cleanup if adjacent edge cases exist'],
      rank: 1,
      recommended: true,
    },
    {
      title: 'Add defensive guard around the failing path',
      summary: 'Introduce a slightly broader safeguard instead of changing surrounding logic.',
      pros: ['Safer rollout', 'Reduces recurrence risk'],
      cons: ['May leave the deeper cleanup for later'],
      rank: 2,
      recommended: false,
    },
  ];
}

function normalizePrDescription(value, issue, analysis, patchStats) {
  const title = String(value?.title || `Fix: ${issue.title}`).trim();
  const summary =
    String(value?.summary || analysis.reasoningSummary || '').trim() ||
    `Address ${issue.title} with a focused code change.`;
  const rootCause =
    String(value?.rootCause || analysis.rootCause || '').trim() ||
    'Likely root cause identified from the matched code context.';
  const changes = Array.isArray(value?.changes)
    ? value.changes.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
    : [
        `Apply a focused patch touching ${patchStats.fileCount} file${
          patchStats.fileCount === 1 ? '' : 's'
        }.`,
      ];
  const impact =
    String(value?.impact || '').trim() ||
    `Low-to-medium operational risk with ${patchStats.changedLineCount} changed line${
      patchStats.changedLineCount === 1 ? '' : 's'
    }.`;
  const confidence = toPercent(value?.confidence, analysis.confidence * 100);

  return {
    title,
    summary,
    rootCause,
    changes,
    impact,
    confidence,
  };
}

async function identifyRootCause(issue, files, repository = null, repoStructure = null, issueIntelligence = null) {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      possibleCauses: [
        'No high-confidence repository match was found for the current issue.',
      ],
      rootCause:
        'AgenticPulse could not isolate a reliable code location for this issue from the connected repository.',
      confidence: 0.18,
      targetFiles: [],
      reasoningSummary:
        'Repository context was too weak to draft a safe patch, so the analysis stayed in reasoning-only mode.',
    };
  }

  const context = buildGroqCodeContext({
    issue,
    repository,
    repoStructure,
    files,
  });

  const content = await callGroq(
    [
      {
        role: 'system',
        content:
          'You are a senior software engineer. Identify the likely root cause using only the issue and targeted code context. Return strict JSON with keys possibleCauses, rootCause, confidence, targetFiles, reasoningSummary.',
      },
      {
        role: 'user',
        content: [
          `${context.repoSummary}`,
          '',
          `Issue title:\n${context.issueTitle}`,
          '',
          `Issue description:\n${context.issueDescription}`,
          '',
          issueIntelligence
            ? `Unified issue intelligence:\n${JSON.stringify(issueIntelligence, null, 2)}`
            : '',
          '',
          `Relevant Code:\n${context.codeSummary}`,
          '',
          'Constraints:',
          '- Be concise and specific',
          '- Focus on the most likely cause',
          '- possibleCauses must be a short array of plausible causes ranked best-first',
          '- confidence must be a number between 0 and 1',
          '- targetFiles must be an array of file paths',
        ].join('\n'),
      },
    ],
    {
      temperature: 0.1,
    }
  );

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Root cause analysis returned invalid JSON.');
  }

  return {
    possibleCauses: normalizePossibleCauses(
      parsed.possibleCauses,
      parsed.rootCause
    ),
    rootCause: String(parsed.rootCause || '').trim() || 'Root cause not identified.',
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.45))),
    targetFiles: Array.isArray(parsed.targetFiles)
      ? parsed.targetFiles.map((value) => String(value))
      : files.slice(0, 2).map((file) => file.path),
    reasoningSummary:
      String(parsed.reasoningSummary || '').trim() || 'Root cause analysis generated.',
  };
}

function countChangedLines(patch) {
  const lines = String(patch || '').split('\n');
  let added = 0;
  let removed = 0;
  let files = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) files += 1;
    if (line.startsWith('+') && !line.startsWith('+++')) added += 1;
    if (line.startsWith('-') && !line.startsWith('---')) removed += 1;
  }

  return {
    fileCount: files,
    changedLineCount: added + removed,
  };
}

function validatePatch(patch, analysis) {
  const diff = extractDiffBlock(patch);
  if (!diff) {
    throw new Error('Patch response did not include a valid diff block.');
  }

  const stats = countChangedLines(diff);
  if (stats.fileCount > 5) {
    throw new Error('Rejected patch because it touches too many files.');
  }
  if (stats.changedLineCount > 120) {
    throw new Error('Rejected patch because it is too large.');
  }
  if (analysis.confidence < 0.45) {
    throw new Error('Rejected patch because the root cause confidence is too low.');
  }
  if (
    String(analysis.rootCause || '').trim().length < 18 ||
    String(analysis.rootCause || '').toLowerCase().includes('not identified')
  ) {
    throw new Error('Rejected patch because the root cause is unclear.');
  }

  return {
    patch: diff,
    fileCount: stats.fileCount,
    changedLineCount: stats.changedLineCount,
  };
}

function parseStructuredPatchResponse(content) {
  try {
    const parsed = JSON.parse(String(content || '{}'));
    return {
      explanation: String(parsed.explanation || '').trim(),
      patch: extractDiffBlock(parsed.patch || ''),
      alternativeFixes: parsed.alternativeFixes,
      prDescription: parsed.prDescription || null,
    };
  } catch {
    const text = String(content || '').trim();
    const explanationMatch = text.match(/Explanation:\s*([\s\S]*?)(?:\nPatch:|$)/i);
    const patch = extractDiffBlock(text);

    return {
      explanation: explanationMatch?.[1]?.trim() || '',
      patch,
      alternativeFixes: [],
      prDescription: null,
    };
  }
}

function buildFallbackPatchResult(issue, analysis, files, reason, parsed = {}) {
  const targetFiles =
    Array.isArray(analysis?.targetFiles) && analysis.targetFiles.length
      ? analysis.targetFiles
      : files.slice(0, 3).map((file) => file.path);
  const safeReason =
    String(reason || '').trim() ||
    'Patch generation could not complete safely for this issue.';

  return {
    rootCause: analysis?.rootCause || 'Root cause not confirmed.',
    possibleCauses: normalizePossibleCauses(
      analysis?.possibleCauses,
      analysis?.rootCause || 'Unable to confirm a precise code location.'
    ),
    selectedRootCause: analysis?.rootCause || 'Root cause not confirmed.',
    rootCauseConfidence: Number(((analysis?.confidence || 0.18) * 100).toFixed(1)),
    patchConfidence: 0,
    patch: '',
    reasoningSummary:
      String(parsed?.explanation || '').trim() ||
      analysis?.reasoningSummary ||
      safeReason,
    alternativeFixes: normalizeAlternativeFixes(
      parsed?.alternativeFixes,
      '',
      targetFiles
    ),
    prDescription: normalizePrDescription(
      parsed?.prDescription,
      issue,
      {
        rootCause: analysis?.rootCause || 'Root cause not confirmed.',
        reasoningSummary:
          String(parsed?.explanation || '').trim() ||
          analysis?.reasoningSummary ||
          safeReason,
        confidence: analysis?.confidence || 0.18,
      },
      {
        fileCount: Math.max(targetFiles.length, files.length, 1),
        changedLineCount: 0,
      }
    ),
    targetFiles,
    changedFileCount: 0,
    changedLineCount: 0,
    model: `${DEFAULT_MODEL}-fallback`,
    fallbackReason: safeReason,
  };
}

async function generatePatch(issue, files, options = {}) {
  const issueIntelligence = options.issueIntelligence || null;
  const cacheKey = createCacheKey(issue, files, issueIntelligence);
  const cached = getCacheValue(cacheKey);
  if (cached) {
    return cached;
  }

  const repository = options.repository || null;
  const repoStructure = options.repoStructure || null;
  const analysis = await identifyRootCause(issue, files, repository, repoStructure, issueIntelligence);
  if (!Array.isArray(files) || files.length === 0) {
    const result = buildFallbackPatchResult(
      issue,
      analysis,
      [],
      'No relevant code files were found for this issue, so a safe patch could not be drafted.'
    );
    setCacheValue(cacheKey, result);
    return result;
  }
  const focusedFiles = files.filter((file) => analysis.targetFiles.includes(file.path));
  const contextFiles = (focusedFiles.length ? focusedFiles : files).slice(0, 5);
  const context = buildGroqCodeContext({
    issue,
    repository,
    repoStructure,
    files: contextFiles,
  });

  const content = await callGroq(
    [
      {
        role: 'system',
        content: [
          'You are a senior software engineer.',
          'Use structured, concise reasoning and generate the smallest safe production fix.',
          'Do not reveal private chain-of-thought or hidden internal reasoning.',
          'Return strict JSON with keys explanation, alternativeFixes, patch, prDescription.',
          'alternativeFixes must contain 2 or 3 ranked options with title, summary, pros, cons, rank, recommended.',
          'prDescription must contain title, summary, rootCause, changes, impact, confidence.',
          'patch must be a unified diff inside a ```diff fenced block.',
          'Do not rewrite full files.',
          'Do not change unrelated logic.',
          'Keep fixes minimal and safe.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          `${context.repoSummary}`,
          '',
          `Issue title:\n${context.issueTitle}`,
          '',
          `Issue description:\n${context.issueDescription}`,
          '',
          issueIntelligence
            ? `Unified issue intelligence:\n${JSON.stringify(issueIntelligence, null, 2)}`
            : '',
          '',
          `Relevant Code:\n${context.codeSummary}`,
          '',
          'Task:',
          '1. Identify root cause',
          '2. Explain clearly',
          '3. Suggest minimal fix',
          '4. Return DIFF patch only',
          '',
          'Known root cause:',
          analysis.rootCause,
          '',
          'Possible causes:',
          analysis.possibleCauses.map((cause, index) => `${index + 1}. ${cause}`).join('\n'),
          '',
          'Known reasoning summary:',
          analysis.reasoningSummary,
          '',
          'Required response behavior:',
          '- explanation should state the selected root cause and why it is the best fit',
          '- include 2-3 alternative fixes and rank them',
          '- recommend the safest minimal option',
          '- keep PR description concise and reviewer-friendly',
          '- use the unified issue intelligence to focus on the most likely failing path',
        ].join('\n'),
      },
    ],
    {
      temperature: 0.1,
    }
  ).catch((error) =>
    JSON.stringify({
      explanation:
        error instanceof Error
          ? error.message
          : 'Groq patch generation failed.',
      patch: '',
      alternativeFixes: [],
      prDescription: null,
    })
  );

  const parsed = parseStructuredPatchResponse(content);
  let result;
  try {
    const validated = validatePatch(parsed.patch, analysis);
    const patchConfidence = Math.max(
      0,
      Math.min(
        100,
        Number(
          (
            analysis.confidence * 100 -
            Math.max(0, validated.changedLineCount - 20) * 0.5
          ).toFixed(1)
        )
      )
    );
    result = {
      rootCause: parsed.rootCause || analysis.rootCause,
      possibleCauses: analysis.possibleCauses,
      selectedRootCause: parsed.rootCause || analysis.rootCause,
      rootCauseConfidence: Number((analysis.confidence * 100).toFixed(1)),
      patchConfidence,
      patch: validated.patch,
      reasoningSummary: parsed.explanation || analysis.reasoningSummary,
      alternativeFixes: normalizeAlternativeFixes(
        parsed.alternativeFixes,
        validated.patch,
        analysis.targetFiles
      ),
      prDescription: normalizePrDescription(
        parsed.prDescription,
        issue,
        analysis,
        validated
      ),
      targetFiles: analysis.targetFiles,
      changedFileCount: validated.fileCount,
      changedLineCount: validated.changedLineCount,
      model: DEFAULT_MODEL,
    };
  } catch (error) {
    result = buildFallbackPatchResult(
      issue,
      analysis,
      files,
      error instanceof Error ? error.message : 'Patch validation failed.',
      parsed
    );
  }

  setCacheValue(cacheKey, result);
  return result;
}

module.exports = {
  buildGroqCodeContext,
  generatePatch,
  identifyRootCause,
  parseStructuredPatchResponse,
  validatePatch,
};
