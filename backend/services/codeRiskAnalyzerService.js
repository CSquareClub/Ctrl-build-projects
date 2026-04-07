const esprima = require('esprima');
const { parse: parseWithBabel } = require('@babel/parser');
const { groqJsonRequest } = require('../lib/groqFeedbackClassifier');
const {
  detectCodeLanguage,
  supportsAstAnalysis,
} = require('./codeLanguageService');

const LLM_TIMEOUT_MS = 4500;

const SEVERITY_WEIGHT = {
  low: 0.3,
  medium: 0.6,
  high: 0.9,
};

function normalizeSeverity(value, fallback = 'medium') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return fallback;
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function createIssue(title, source, severity, detail, location = null) {
  return {
    title,
    source,
    severity: normalizeSeverity(severity),
    detail: String(detail || title).slice(0, 300),
    location,
    startLine: location?.startLine ?? location?.line ?? null,
    endLine: location?.endLine ?? location?.line ?? null,
  };
}

function walkAst(node, visitor, parent = null) {
  if (!node || typeof node !== 'object') {
    return;
  }

  visitor(node, parent);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        walkAst(child, visitor, node);
      }
      continue;
    }

    if (value && typeof value === 'object' && value.type) {
      walkAst(value, visitor, node);
    }
  }
}

function getNodeLocation(node) {
  if (!node?.loc?.start) return null;
  return {
    line: node.loc.start.line,
    column: node.loc.start.column + 1,
    startLine: node.loc.start.line,
    endLine: node.loc.end?.line || node.loc.start.line,
    endColumn: (node.loc.end?.column ?? node.loc.start.column) + 1,
  };
}

function analyzeAst(code, language = 'javascript') {
  if (!supportsAstAnalysis(language)) {
    return {
      parseMode: 'ast-unsupported',
      issues: [],
      complexitySignals: 0,
    };
  }

  const astIssues = [];
  let complexitySignals = 0;

  let ast = null;
  let parseMode = 'module';

  try {
    ast = esprima.parseModule(code, { loc: true, range: true, tolerant: true });
  } catch {
    try {
      parseMode = 'script';
      ast = esprima.parseScript(code, { loc: true, range: true, tolerant: true });
    } catch {
      try {
        parseMode = 'babel-fallback';
        ast = parseWithBabel(String(code || ''), {
          sourceType: 'unambiguous',
          errorRecovery: true,
          ranges: true,
          tokens: false,
          plugins: ['jsx', 'typescript'],
        });
      } catch {
        return {
          parseMode: 'unparsed',
          issues: [],
          complexitySignals: 0,
        };
      }
    }
  }

  const declaredVariables = new Map();
  const usedIdentifiers = new Set();
  const promiseBindings = new Map();

  function addIssue(issue) {
    const key = `${issue.source}:${issue.title}:${issue.startLine || issue.location?.line || 0}`;
    if (!astIssues.some((entry) => `${entry.source}:${entry.title}:${entry.startLine || entry.location?.line || 0}` === key)) {
      astIssues.push(issue);
    }
  }

  function containsTryCatch(node) {
    let found = false;
    walkAst(node.body || node, (child) => {
      if (child.type === 'TryStatement') {
        found = true;
      }
    });
    return found;
  }

  function containsAwait(node) {
    let found = false;
    walkAst(node.body || node, (child) => {
      if (child.type === 'AwaitExpression') {
        found = true;
      }
    });
    return found;
  }

  walkAst(ast, (node, parent) => {
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const isAsync = node.async === true;
        if (isAsync && containsAwait(node) && !containsTryCatch(node)) {
          addIssue(
            createIssue(
              'Unhandled async error risk',
              'AST',
              'medium',
              'Async function contains await but no try/catch safety boundary.',
              getNodeLocation(node)
            )
          );
        }
        break;
      }
      case 'VariableDeclarator': {
        if (node.id?.type === 'Identifier') {
          declaredVariables.set(node.id.name, {
            location: getNodeLocation(node),
            initializedWithPromise:
              node.init?.type === 'CallExpression' &&
              node.init?.callee?.type === 'MemberExpression' &&
              node.init.callee.property?.name === 'then',
          });

          if (
            node.init?.type === 'CallExpression' &&
            /(fetch|axios|request|query|save|create|update|delete|find|send)/i.test(
              node.init.callee?.name || node.init.callee?.property?.name || ''
            )
          ) {
            promiseBindings.set(node.id.name, getNodeLocation(node));
          }
        }
        break;
      }
      case 'Identifier': {
        if (
          parent?.type === 'VariableDeclarator' &&
          parent.id === node
        ) {
          return;
        }
        if (
          parent?.type === 'MemberExpression' &&
          parent.property === node &&
          parent.computed === false
        ) {
          return;
        }
        usedIdentifiers.add(node.name);
        break;
      }
      case 'MemberExpression': {
        if (node.optional !== true && parent?.type !== 'ChainExpression') {
          const objectName = node.object?.name || '';
          if (['req', 'res', 'user', 'data', 'payload', 'input', 'result'].includes(objectName)) {
            addIssue(
              createIssue(
                'Possible null or undefined access',
                'AST',
                'medium',
                `Property access on "${objectName}" is not guarded with optional chaining.`,
                getNodeLocation(node)
              )
            );
          }
        }
        break;
      }
      case 'IfStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'SwitchCase':
        complexitySignals += 1;
        break;
      case 'CallExpression': {
        const calleeName = node.callee?.name || node.callee?.property?.name || '';
        if (
          parent?.type === 'ExpressionStatement' &&
          /(fetch|axios|request|query|save|create|update|delete|find|send)/i.test(calleeName)
        ) {
          addIssue(
            createIssue(
              'Unhandled promise or side effect',
              'AST',
              'medium',
              `Call to "${calleeName}" is not awaited or wrapped in explicit handling.`,
              getNodeLocation(node)
            )
          );
        }

        if (
          /(password|secret|token|apikey|api_key|privateKey)/i.test(code.slice(node.range?.[0] || 0, node.range?.[1] || 0)) &&
          node.arguments?.some((arg) => arg.type === 'Literal')
        ) {
          addIssue(
            createIssue(
              'Possible hardcoded credential',
              'AST',
              'high',
              'Sensitive credential-like value appears hardcoded in a function call.',
              getNodeLocation(node)
            )
          );
        }
        break;
      }
      case 'Literal': {
        if (
          typeof node.value === 'string' &&
          /(sk_[a-z0-9]{10,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z-_]{20,})/.test(node.value)
        ) {
          addIssue(
            createIssue(
              'Hardcoded credential detected',
              'AST',
              'high',
              'A literal resembles an access key or secret token.',
              getNodeLocation(node)
            )
          );
        }
        break;
      }
      case 'AssignmentExpression': {
        const leftName = node.left?.name || node.left?.property?.name || '';
        if (
          /(password|secret|token|apikey|api_key)/i.test(leftName) &&
          node.right?.type === 'Literal'
        ) {
          addIssue(
            createIssue(
              'Hardcoded credential assignment',
              'AST',
              'high',
              `Sensitive field "${leftName}" is assigned a literal value.`,
              getNodeLocation(node)
            )
          );
        }
        break;
      }
      default:
        break;
    }
  });

  for (const [name, meta] of declaredVariables.entries()) {
    if (!usedIdentifiers.has(name) && !/^_/.test(name)) {
      addIssue(
        createIssue(
          'Unused variable',
          'AST',
          'low',
          `Variable "${name}" is declared but never used.`,
          meta.location
        )
      );
    }
  }

  if (complexitySignals >= 8) {
    addIssue(
      createIssue(
        'Deep nesting or complexity risk',
        'AST',
        complexitySignals >= 12 ? 'high' : 'medium',
        'The code has multiple nested branches/loops and may be harder to maintain safely.'
      )
    );
  }

  if (
    /(req\.body|req\.query|req\.params|input|payload)/.test(code) &&
    !/(zod|joi|yup|validator|validate\(|schema\.parse|schema\.safeParse|express-validator)/.test(code)
  ) {
    addIssue(
      createIssue(
        'Missing input validation',
        'AST',
        'medium',
        'External input is used without any obvious validation layer.'
      )
    );
  }

  return {
    parseMode,
    issues: astIssues,
    complexitySignals,
  };
}

async function runLlmAnalyzer(code, language) {
  if (!process.env.GROQ_API_KEY) {
    return {
      issues: [],
      suggestions: [],
      confidence: 0.42,
      timedOut: false,
      fallback: true,
    };
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('LLM analysis timed out.')), LLM_TIMEOUT_MS)
  );

  try {
    const parsed = await Promise.race([
      groqJsonRequest([
        {
          role: 'system',
          content: [
            'You are a lightweight code risk analyzer.',
            'Analyze code for bugs, edge cases, security issues, and performance risks.',
            'Return strict JSON only with keys: issues, suggestions, confidence.',
            'Each issue must have title, severity, detail.',
            'Each suggestion must be a short actionable string.',
            'Keep output concise and demo-friendly.',
            'Use the provided language to stay grounded in the syntax and ecosystem.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            language,
            code: String(code || '').slice(0, 16000),
          }),
        },
      ]),
      timeoutPromise,
    ]);

    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues.slice(0, 8).map((issue) =>
          createIssue(
            issue?.title || 'Potential code risk',
            'LLM',
            issue?.severity || 'medium',
            issue?.detail || issue?.reason || issue?.title || 'Potential issue identified by model.'
          )
        )
      : [];

    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    return {
      issues,
      suggestions,
      confidence: clamp(Number(parsed?.confidence || 0.72), 0.3, 0.95),
      timedOut: false,
      fallback: false,
    };
  } catch {
    return {
      issues: [],
      suggestions: [],
      confidence: 0.46,
      timedOut: true,
      fallback: true,
    };
  }
}

function mergeIssues(astIssues, llmIssues) {
  const merged = [];
  const seen = new Map();

  for (const issue of [...astIssues, ...llmIssues]) {
    const normalizedTitle = String(issue.title || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const key = normalizedTitle || buildFallbackIssueKey(issue);

    const existing = seen.get(key);
    if (!existing) {
      const entry = {
        ...issue,
        source: issue.source,
      };
      seen.set(key, entry);
      merged.push(entry);
      continue;
    }

    if (!String(existing.source).includes(issue.source)) {
      existing.source = `${existing.source}+${issue.source}`;
    }

    if (SEVERITY_WEIGHT[normalizeSeverity(issue.severity)] > SEVERITY_WEIGHT[normalizeSeverity(existing.severity)]) {
      existing.severity = normalizeSeverity(issue.severity);
      existing.detail = issue.detail || existing.detail;
    }
  }

  return merged.slice(0, 12);
}

function buildFallbackIssueKey(issue) {
  return `${issue.source}:${issue.detail || issue.title}`;
}

function mergeSuggestions(astIssues, llmSuggestions) {
  const astSuggestions = astIssues.map((issue) => {
    if (/async error/i.test(issue.title)) return 'Add try/catch blocks around async operations.';
    if (/hardcoded credential/i.test(issue.title)) return 'Move secrets into environment variables or a secret manager.';
    if (/input validation/i.test(issue.title)) return 'Validate untrusted input before using it in business logic.';
    if (/null or undefined access/i.test(issue.title)) return 'Guard nullable values with checks or optional chaining.';
    if (/unused variable/i.test(issue.title)) return 'Remove dead variables to reduce confusion and hidden bugs.';
    return 'Refactor this area to reduce complexity and improve safety.';
  });

  return [...new Set([...astSuggestions, ...llmSuggestions].filter(Boolean))].slice(0, 8);
}

function computeRiskScore(issues, complexitySignals) {
  const issueCountFactor = clamp(issues.length / 8);
  const severityAverage = issues.length
    ? issues.reduce((sum, issue) => sum + SEVERITY_WEIGHT[normalizeSeverity(issue.severity)], 0) / issues.length
    : 0;
  const complexityScore = clamp(complexitySignals / 12);

  return clamp(
    0.4 * severityAverage +
      0.3 * issueCountFactor +
      0.3 * complexityScore
  );
}

function computeConfidence(astIssues, llmIssues, llmConfidence) {
  if (!llmIssues.length) {
    return clamp(0.55 + Math.min(astIssues.length, 4) * 0.05);
  }

  const astTitles = new Set(astIssues.map((issue) => String(issue.title).toLowerCase()));
  const overlap = llmIssues.filter((issue) => astTitles.has(String(issue.title).toLowerCase())).length;
  const consistency = llmIssues.length ? overlap / llmIssues.length : 0;
  const repeatedPatternBoost = Math.min(astIssues.length, 4) * 0.04;

  return clamp(0.45 + llmConfidence * 0.3 + consistency * 0.2 + repeatedPatternBoost);
}

async function analyzeCodeRisk({ code, language = '', filePath = '' }) {
  const safeCode = String(code || '');
  if (!safeCode.trim()) {
    throw new Error('code is required.');
  }

  const detectedLanguage = detectCodeLanguage({
    code: safeCode,
    filePath,
    hint: language,
  });
  const astResult = analyzeAst(safeCode, detectedLanguage);
  const llmResult = await runLlmAnalyzer(safeCode, detectedLanguage);
  const issues = mergeIssues(astResult.issues, llmResult.issues);
  const suggestions = mergeSuggestions(astResult.issues, llmResult.suggestions);
  const riskScore = computeRiskScore(issues, astResult.complexitySignals);
  const confidence = computeConfidence(astResult.issues, llmResult.issues, llmResult.confidence);

  return {
    risk_score: Number(riskScore.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    issues: issues.map((issue) => ({
      title: issue.title,
      source: issue.source,
      severity: normalizeSeverity(issue.severity),
      detail: issue.detail,
      startLine: issue.startLine ?? null,
      endLine: issue.endLine ?? null,
      location: issue.location || null,
    })),
    suggestions,
    meta: {
      parser: 'esprima',
      detected_language: detectedLanguage,
      ast_supported: supportsAstAnalysis(detectedLanguage),
      parse_mode: astResult.parseMode,
      ast_issue_count: astResult.issues.length,
      llm_issue_count: llmResult.issues.length,
      llm_fallback: llmResult.fallback,
      llm_timed_out: llmResult.timedOut,
      complexity_signals: astResult.complexitySignals,
    },
  };
}

module.exports = {
  analyzeCodeRisk,
};
