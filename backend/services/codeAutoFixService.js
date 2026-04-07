const { parse } = require('@babel/parser');
const { createTwoFilesPatch } = require('diff');
const { groqJsonRequest } = require('../lib/groqFeedbackClassifier');
const {
  detectCodeLanguage,
  getLanguageDisplayName,
  supportsAstAnalysis,
} = require('./codeLanguageService');

const FIX_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 5 * 60 * 1000;

const fixCache = new Map();

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

function safeParse(code) {
  return parse(String(code || ''), {
    sourceType: 'unambiguous',
    errorRecovery: true,
    ranges: true,
    tokens: false,
    plugins: ['jsx', 'typescript'],
  });
}

function walk(node, visitor, parent = null) {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        walk(child, visitor, node);
      }
      continue;
    }
    if (value && typeof value === 'object' && value.type) {
      walk(value, visitor, node);
    }
  }
}

function getNodeRange(node, code) {
  if (!node?.start && node?.start !== 0) return null;
  const start = node.start;
  const end = node.end;
  const loc = node.loc;
  return {
    start,
    end,
    startLine: loc?.start?.line || 1,
    endLine: loc?.end?.line || loc?.start?.line || 1,
    contextCode: String(code || '').slice(start, end),
  };
}

function functionContainsTry(node) {
  let found = false;
  walk(node.body || node, (child) => {
    if (child.type === 'TryStatement') found = true;
  });
  return found;
}

function functionContainsAwait(node) {
  let found = false;
  walk(node.body || node, (child) => {
    if (child.type === 'AwaitExpression') found = true;
  });
  return found;
}

function getMemberRootName(node) {
  if (!node) return '';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return getMemberRootName(node.object);
  return '';
}

function buildAstTargets(code, language = 'javascript') {
  if (!supportsAstAnalysis(language)) {
    return [];
  }

  const ast = safeParse(code);
  const findings = [];

  function addFinding(finding) {
    if (!finding?.range?.contextCode) return;
    const key = `${finding.type}:${finding.range.start}:${finding.range.end}`;
    if (!findings.some((entry) => `${entry.type}:${entry.range.start}:${entry.range.end}` === key)) {
      findings.push(finding);
    }
  }

  walk(ast, (node, parent) => {
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      if (node.async && functionContainsAwait(node) && !functionContainsTry(node)) {
        addFinding({
          type: 'Unhandled async error',
          severity: 'medium',
          astScore: 0.92,
          nodeType: node.type,
          reason: 'Async function awaits work without a try/catch safety boundary.',
          impact: 'Rejected promises can bubble up and break the request or UI flow.',
          fix: 'Wrap awaited operations in try/catch and return a safe fallback or error response.',
          range: getNodeRange(node, code),
        });
      }
    }

    if (node.type === 'MemberExpression' && !node.optional && parent?.type !== 'OptionalMemberExpression') {
      const rootName = getMemberRootName(node.object);
      if (['req', 'res', 'user', 'data', 'payload', 'input', 'result'].includes(rootName)) {
        addFinding({
          type: 'Unsafe nullable access',
          severity: 'medium',
          astScore: 0.78,
          nodeType: node.type,
          reason: `Property access on "${rootName}" is not guarded with optional chaining or validation.`,
          impact: 'Null or undefined values can throw at runtime.',
          fix: 'Add a guard or optional chaining before reading nested properties.',
          range: getNodeRange(node, code),
        });
      }
    }

    if (node.type === 'CallExpression') {
      const calleeName = node.callee?.name || node.callee?.property?.name || '';
      if (
        parent?.type === 'ExpressionStatement' &&
        /(fetch|axios|request|query|save|create|update|delete|find|send)/i.test(calleeName)
      ) {
        addFinding({
          type: 'Unhandled promise',
          severity: 'medium',
          astScore: 0.82,
          nodeType: node.type,
          reason: `Call to "${calleeName}" appears to fire without await or explicit error handling.`,
          impact: 'Network or async failures may be silently ignored.',
          fix: 'Await the promise or attach explicit success/error handling.',
          range: getNodeRange(node, code),
        });
      }
    }
  });

  if (
    /(req\.body|req\.query|req\.params|input|payload)/.test(code) &&
    !/(zod|joi|yup|validator|validate\(|schema\.parse|schema\.safeParse|express-validator)/.test(code)
  ) {
    findings.push({
      type: 'Missing input validation',
      severity: 'medium',
      astScore: 0.7,
      nodeType: 'Program',
      reason: 'External input is used without an obvious validation layer.',
      impact: 'Invalid input can flow into core logic and create runtime bugs or security gaps.',
      fix: 'Validate untrusted input before branching on it or persisting it.',
      range: {
        start: 0,
        end: code.length,
        startLine: 1,
        endLine: Math.max(1, String(code || '').split('\n').length),
        contextCode: code,
      },
    });
  }

  return findings;
}

function chooseTargetFinding(findings, requestedIssue) {
  if (!findings.length) return null;

  if (requestedIssue?.startLine || requestedIssue?.title) {
    const line = Number(requestedIssue?.startLine || 0);
    const title = String(requestedIssue?.title || '').toLowerCase();
    const matched = findings.find((finding) => {
      const lineMatch = line
        ? line >= finding.range.startLine && line <= finding.range.endLine
        : false;
      const titleMatch = title
        ? finding.type.toLowerCase().includes(title) || title.includes(finding.type.toLowerCase())
        : false;
      return lineMatch || titleMatch;
    });
    if (matched) return matched;
  }

  return [...findings].sort((a, b) => {
    const severityRank = { high: 3, medium: 2, low: 1 };
    const severityDiff =
      (severityRank[normalizeSeverity(b.severity)] || 0) -
      (severityRank[normalizeSeverity(a.severity)] || 0);
    if (severityDiff !== 0) return severityDiff;
    return b.astScore - a.astScore;
  })[0];
}

function createFallbackFix(target, snippet) {
  const normalizedType = String(target?.type || '').toLowerCase();
  const safeSnippet = String(snippet || '');

  const auditLeadPattern =
    /\bhandleSubmit\b/.test(safeSnippet) &&
    /\bFormData\b/.test(safeSnippet) &&
    (/project_details/.test(safeSnippet) || /source:\s*["']audit["']/.test(safeSnippet) || /Error submitting audit request/.test(safeSnippet));

  if (auditLeadPattern) {
    let nextSnippet = safeSnippet;

    if (!/import\s+\{\s*submitLead\s*\}\s+from\s+["']@\/lib\/supabase["']/.test(nextSnippet)) {
      const importStatement = 'import { submitLead } from "@/lib/supabase";';
      if (/^import\s/m.test(nextSnippet)) {
        const importMatches = [...nextSnippet.matchAll(/^import .*$/gm)];
        const lastImport = importMatches[importMatches.length - 1];
        if (lastImport && typeof lastImport.index === 'number') {
          const insertAt = lastImport.index + lastImport[0].length;
          nextSnippet = `${nextSnippet.slice(0, insertAt)}\n${importStatement}${nextSnippet.slice(insertAt)}`;
        } else {
          nextSnippet = `${importStatement}\n${nextSnippet}`;
        }
      } else {
        nextSnippet = `${importStatement}\n${nextSnippet}`;
      }
    }

    if (
      /const formData = new FormData\(e\.currentTarget\);/.test(nextSnippet) &&
      !/const data = \{[\s\S]*source:\s*["']audit["'][\s\S]*\};/.test(nextSnippet)
    ) {
      nextSnippet = nextSnippet.replace(
        /const formData = new FormData\(e\.currentTarget\);/,
        [
          'const formData = new FormData(e.currentTarget);',
          '    const data = {',
          '      name: name || (formData.get("name") as string) || "Unknown",',
          '      email: email || (formData.get("email") as string) || "",',
          '      phone: (formData.get("phone") as string) || "Not provided",',
          '      business: (formData.get("business") as string) || "Not provided",',
          '      industry: "Inquiry",',
          '      city: "Unknown",',
          '      website: (formData.get("website") as string) || "",',
          '      social: (formData.get("social") as string) || "",',
          '      project_details: (formData.get("project_details") as string) || "",',
          '      source: "audit" as const,',
          '    };',
        ].join('\n')
      );
    }

    if (!/\bsubmitLead\s*\(\s*data\s*\)/.test(nextSnippet)) {
      nextSnippet = nextSnippet.replace(
        /throw new Error\([\s\S]*?\);/,
        'await submitLead(data);'
      );
    }

    return nextSnippet;
  }

  if (normalizedType.includes('async error') && safeSnippet.includes('{') && safeSnippet.includes('}')) {
    const match = safeSnippet.match(/^([\s\S]*?\{)([\s\S]*)(\}\s*)$/);
    if (match) {
      const innerBody = match[2].trim();
      const indentMatch = innerBody.match(/\n(\s+)/);
      const indent = indentMatch?.[1] || '  ';
      const nestedIndent = `${indent}  `;
      return `${match[1]}\n${indent}try {\n${nestedIndent}${innerBody.replace(/\n/g, `\n${nestedIndent}`)}\n${indent}} catch (error) {\n${nestedIndent}console.error(error);\n${nestedIndent}throw error;\n${indent}}\n}`;
    }
  }

  if (normalizedType.includes('nullable access')) {
    return safeSnippet.replace(/(\b(?:req|res|user|data|payload|input|result)\b)\.([A-Za-z_$][\w$]*)/g, '$1?.$2');
  }

  if (normalizedType.includes('unhandled promise')) {
    return safeSnippet.startsWith('await ') ? safeSnippet : `await ${safeSnippet}`;
  }

  if (normalizedType.includes('input validation')) {
    return `if (!input) {\n  throw new Error("Invalid input");\n}\n\n${safeSnippet}`;
  }

  return safeSnippet;
}

async function runGroqFix(target, snippet, language) {
  if (!process.env.GROQ_API_KEY) {
    return {
      correctedCode: '',
      explanation: '',
      severity: normalizeSeverity(target?.severity),
      llmScore: 0.35,
      fallback: true,
      timedOut: false,
    };
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('LLM fix timed out.')), FIX_TIMEOUT_MS)
  );

  try {
    const parsed = await Promise.race([
      groqJsonRequest([
        {
          role: 'system',
          content: [
            'You are a safe code fixer.',
            'Return strict JSON only with keys: corrected_code, explanation, severity, llm_confidence.',
            'Make minimal changes.',
            'Do not rewrite unrelated code.',
            'Preserve existing behavior except for the requested safety fix.',
            'If the code already has a real persistence or submission flow, preserve it and repair it instead of replacing it with placeholder errors or fake handlers.',
            'Do not invent throw new Error calls when the existing code should call a real helper such as submitLead, save, create, or send.',
            'Stay grounded in the requested language and keep formatting natural for that ecosystem.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            language: getLanguageDisplayName(language),
            issue: target.type,
            severity: target.severity,
            why: target.reason,
            requested_fix: target.fix,
            snippet: String(snippet || '').slice(0, 5000),
          }),
        },
      ]),
      timeoutPromise,
    ]);

    return {
      correctedCode: String(parsed?.corrected_code || ''),
      explanation: String(parsed?.explanation || ''),
      severity: normalizeSeverity(parsed?.severity || target?.severity),
      llmScore: clamp(Number(parsed?.llm_confidence || 0.72), 0.2, 0.95),
      fallback: false,
      timedOut: false,
    };
  } catch (error) {
    return {
      correctedCode: '',
      explanation: error?.message === 'LLM fix timed out.' ? 'Timed out while generating fix.' : '',
      severity: normalizeSeverity(target?.severity),
      llmScore: 0.32,
      fallback: true,
      timedOut: String(error?.message || '').includes('timed out'),
    };
  }
}

function replaceRange(original, targetRange, replacement) {
  return `${original.slice(0, targetRange.start)}${replacement}${original.slice(targetRange.end)}`;
}

function buildExplanation(target, llmExplanation, finalSnippet) {
  return {
    what: target.type,
    why: target.reason,
    impact: target.impact,
    fix: llmExplanation || target.fix,
    targeted_lines: {
      start: target.range.startLine,
      end: target.range.endLine,
    },
    preview: String(finalSnippet || '').slice(0, 400),
  };
}

function computeConfidence({ astScore, llmScore, consistency, complexity }) {
  return clamp(0.4 * astScore + 0.3 * llmScore + 0.2 * consistency + 0.1 * (1 - complexity));
}

async function generateCodeAutoFix({ code, issue = null, language = '', filePath = '' }) {
  const safeCode = String(code || '');
  if (!safeCode.trim()) {
    throw new Error('code is required.');
  }
  const detectedLanguage = detectCodeLanguage({
    code: safeCode,
    filePath,
    hint: language,
  });
  const astSupported = supportsAstAnalysis(detectedLanguage);

  const cacheKey = JSON.stringify({
    code: safeCode,
    language: detectedLanguage,
    filePath: String(filePath || ''),
    issueTitle: issue?.title || null,
    startLine: issue?.startLine || null,
    endLine: issue?.endLine || null,
  });
  const cached = fixCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const findings = buildAstTargets(safeCode, detectedLanguage);
  const target = chooseTargetFinding(findings, issue) || {
    type: issue?.title || 'Potential code risk',
    severity: normalizeSeverity(issue?.severity),
    astScore: 0.45,
    nodeType: 'Program',
    reason: issue?.detail || 'The analyzer detected a risky pattern in this code.',
    impact: 'This can create runtime instability or make failures harder to recover from.',
    fix: 'Apply a minimal defensive fix.',
    range: {
      start: 0,
      end: safeCode.length,
      startLine: 1,
      endLine: Math.max(1, safeCode.split('\n').length),
      contextCode: safeCode,
    },
  };

  const snippet = target.range.contextCode;
  const llmResult = await runGroqFix(target, snippet, detectedLanguage);
  const fallbackSnippet = createFallbackFix(target, snippet);
  const correctedSnippet = (llmResult.correctedCode || fallbackSnippet || snippet).trimEnd();
  const updatedCode = replaceRange(safeCode, target.range, correctedSnippet);

  let syntaxSafe = true;
  if (astSupported) {
    try {
      safeParse(updatedCode);
    } catch {
      syntaxSafe = false;
    }
  }

  const finalCode = syntaxSafe ? updatedCode : replaceRange(safeCode, target.range, fallbackSnippet || snippet);
  const finalSnippet = syntaxSafe ? correctedSnippet : fallbackSnippet || snippet;
  const complexityScore = clamp(findings.length / 10);
  const consistency =
    correctedSnippet && correctedSnippet !== snippet
      ? 0.85
      : fallbackSnippet && fallbackSnippet !== snippet
        ? 0.65
        : 0.3;
  const confidence = computeConfidence({
    astScore: target.astScore,
    llmScore: llmResult.llmScore,
    consistency,
    complexity: complexityScore,
  });

  const patch = createTwoFilesPatch(
    'original.js',
    'updated.js',
    safeCode,
    finalCode,
    'original',
    'updated'
  );

  const result = {
    original: safeCode,
    updated: finalCode,
    patch,
    target: {
      nodeType: target.nodeType,
      startLine: target.range.startLine,
      endLine: target.range.endLine,
      contextCode: snippet,
      severity: normalizeSeverity(target.severity),
    },
    confidence: Number(confidence.toFixed(2)),
    explanation: buildExplanation(target, llmResult.explanation, finalSnippet),
    meta: {
      detected_language: detectedLanguage,
      ast_supported: astSupported,
      llm_fallback: llmResult.fallback || !syntaxSafe,
      llm_timed_out: llmResult.timedOut,
      syntax_safe: syntaxSafe,
    },
  };

  fixCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

module.exports = {
  buildAstTargets,
  generateCodeAutoFix,
};
