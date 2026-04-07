const { githubRequest } = require('./githubService');

const MAX_FILES = 3;
const MAX_TOTAL_LINES = 500;
const MAX_LINES_PER_FILE = 180;
const KEYWORD_LIMIT = 6;
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 10;
const FILE_CACHE_TTL_MS = 1000 * 60 * 10;
const searchCache = new Map();
const fileCache = new Map();
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'into',
  'when',
  'where',
  'what',
  'which',
  'have',
  'users',
  'facing',
  'issue',
  'problem',
  'error',
  'broken',
  'after',
  'before',
  'being',
  'failed',
  'failure',
]);

const KEYWORD_SYNONYMS = {
  login: ['auth', 'session', 'signin'],
  signin: ['login', 'auth', 'session'],
  auth: ['login', 'session', 'token'],
  session: ['auth', 'login', 'token'],
  payment: ['billing', 'invoice', 'subscription'],
  billing: ['payment', 'invoice', 'subscription'],
  crash: ['exception', 'error', 'performance'],
  slow: ['performance', 'latency', 'timeout'],
  notification: ['alert', 'email', 'message'],
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\-/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getCacheValue(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCacheValue(cache, key, value, ttl) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

function extractKeywords(issueTitle, issueDescription) {
  const baseTokens = unique(
    normalizeText(`${issueTitle || ''} ${issueDescription || ''}`)
      .split(' ')
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
  ).slice(0, KEYWORD_LIMIT);

  const expanded = [];
  for (const token of baseTokens) {
    expanded.push(token);
    for (const synonym of KEYWORD_SYNONYMS[token] || []) {
      expanded.push(synonym);
    }
  }

  return unique(expanded).slice(0, KEYWORD_LIMIT + 4);
}

function extractContextKeywords(issueIntelligence) {
  const probableContext = issueIntelligence?.probable_context || {};
  const page = String(probableContext.page || '').trim().toLowerCase();
  const api = String(probableContext.api || '').trim().toLowerCase();
  const componentHint = String(probableContext.component_hint || '').trim();

  const segments = [
    ...page.split(/[^a-z0-9]+/).filter((token) => token.length >= 3),
    ...api.split(/[^a-z0-9]+/).filter((token) => token.length >= 3),
    ...componentHint
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  ];

  return unique(segments).slice(0, 8);
}

function scorePath(path, keywords, issueIntelligence = null) {
  const normalizedPath = normalizeText(path);
  const segments = normalizedPath.split('/');
  const fileName = segments[segments.length - 1] || normalizedPath;
  let score = 0;

  for (const keyword of keywords) {
    if (fileName.includes(keyword)) score += 8;
    if (normalizedPath.includes(`/${keyword}`) || normalizedPath.includes(`${keyword}/`)) {
      score += 5;
    }
    if (normalizedPath.includes(keyword)) score += 3;
  }

  const probableContext = issueIntelligence?.probable_context || {};
  const componentHint = String(probableContext.component_hint || '').toLowerCase();
  if (componentHint) {
    const componentParts = componentHint
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    if (componentParts.some((part) => normalizedPath.includes(part))) {
      score += 10;
    }
  }

  const page = String(probableContext.page || '').toLowerCase();
  if (page) {
    const pageTokens = page.split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
    if (pageTokens.some((token) => normalizedPath.includes(token))) {
      score += 7;
    }
  }

  const api = String(probableContext.api || '').toLowerCase();
  if (api) {
    const apiTokens = api.split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
    if (apiTokens.some((token) => normalizedPath.includes(token))) {
      score += 9;
    }
  }

  if (normalizedPath.includes('test') || normalizedPath.includes('__tests__')) score -= 2;
  if (normalizedPath.includes('dist') || normalizedPath.includes('build')) score -= 4;
  return score;
}

async function searchCode(accessToken, owner, repo, keyword) {
  const cacheKey = `${owner}/${repo}:${keyword}`;
  const cached = getCacheValue(searchCache, cacheKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    q: `${keyword} repo:${owner}/${repo}`,
    per_page: '10',
  });

  const result = await githubRequest(accessToken, `/search/code?${params.toString()}`);
  const items = Array.isArray(result?.items) ? result.items : [];
  setCacheValue(searchCache, cacheKey, items, SEARCH_CACHE_TTL_MS);
  return items;
}

function decodeContent(content, encoding) {
  if (!content) return '';
  if (encoding === 'base64') {
    return Buffer.from(String(content).replace(/\n/g, ''), 'base64').toString('utf8');
  }
  return String(content);
}

function redactSensitiveContent(content) {
  return String(content || '')
    .replace(
      /\b(?:sk|rk|pk|ghp|gho|ghu|github_pat)_[A-Za-z0-9_\-]{8,}\b/g,
      '[REDACTED_SECRET]'
    )
    .replace(/\bAIza[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_GOOGLE_KEY]')
    .replace(/\b(?:xoxb|xoxp|xoxa)-[A-Za-z0-9-]{10,}\b/g, '[REDACTED_TOKEN]')
    .replace(
      /\b[A-Z0-9_]*(?:TOKEN|SECRET|API_KEY|ACCESS_KEY|PRIVATE_KEY|PASSWORD)[A-Z0-9_]*\s*[:=]\s*["'`]?[^"'`\n\r]{6,}/g,
      (match) => {
        const [key] = match.split(/[:=]/);
        return `${key.trim()}=[REDACTED]`;
      }
    )
    .replace(
      /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
      '[REDACTED_PRIVATE_KEY]'
    );
}

async function fetchRepositoryFile(accessToken, owner, repo, path, ref) {
  const cacheKey = `${owner}/${repo}:${ref || 'default'}:${path}`;
  const cached = getCacheValue(fileCache, cacheKey);
  if (cached) {
    return cached;
  }

  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const result = await githubRequest(
    accessToken,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}${query}`
  );

  if (Array.isArray(result)) {
    throw new Error(`Path ${path} is a directory, not a file.`);
  }

  const content = decodeContent(result.content, result.encoding);
  const file = {
    path,
    sha: result.sha,
    size: result.size,
    content,
  };
  setCacheValue(fileCache, cacheKey, file, FILE_CACHE_TTL_MS);
  return file;
}

function buildSnippet(content, keywords, maxLines) {
  const lines = String(content || '').split('\n');
  if (lines.length <= maxLines) {
    return {
      snippet: lines.join('\n'),
      lineCount: lines.length,
      startLine: 1,
      endLine: lines.length,
    };
  }

  const lowerLines = lines.map((line) => line.toLowerCase());
  let matchIndex = lowerLines.findIndex((line) =>
    keywords.some((keyword) => line.includes(keyword))
  );

  if (matchIndex < 0) {
    matchIndex = 0;
  }

  const halfWindow = Math.floor(maxLines / 2);
  const startLine = Math.max(1, matchIndex + 1 - halfWindow);
  const endLine = Math.min(lines.length, startLine + maxLines - 1);

  return {
    snippet: lines.slice(startLine - 1, endLine).join('\n'),
    lineCount: endLine - startLine + 1,
    startLine,
    endLine,
  };
}

function inferFilePurpose(path, snippet) {
  const normalizedPath = normalizeText(path);
  const sample = normalizeText(snippet).slice(0, 400);

  if (normalizedPath.includes('auth') || sample.includes('token') || sample.includes('session')) {
    return 'authentication and session handling';
  }
  if (normalizedPath.includes('login') || sample.includes('signin') || sample.includes('password')) {
    return 'login and user access flow';
  }
  if (normalizedPath.includes('payment') || normalizedPath.includes('billing')) {
    return 'billing and payment handling';
  }
  if (normalizedPath.includes('api') || sample.includes('fetch(') || sample.includes('axios')) {
    return 'API request and data flow handling';
  }
  if (normalizedPath.includes('component') || normalizedPath.endsWith('.tsx') || normalizedPath.endsWith('.jsx')) {
    return 'UI rendering and interaction logic';
  }
  if (normalizedPath.endsWith('.test.js') || normalizedPath.endsWith('.spec.ts')) {
    return 'test coverage for this behavior';
  }
  return 'application logic related to this issue';
}

function computeMatchStrength(path, snippet, keywords) {
  const haystack = `${normalizeText(path)} ${normalizeText(snippet)}`;
  const hits = keywords.filter((keyword) => haystack.includes(keyword)).length;
  return Number(Math.min(hits / Math.max(keywords.length, 1), 1).toFixed(2));
}

async function searchRelevantCode(connection, issue, options = {}) {
  const owner = options.owner || connection.owner;
  const repo = options.repo || connection.name;
  const ref = options.ref || connection.defaultBranch;
  const accessToken = connection.connection.accessToken;
  const intelligenceKeywords = extractContextKeywords(options.issueIntelligence);
  const keywords = unique([
    ...extractKeywords(issue.title, issue.description || issue.summary || ''),
    ...intelligenceKeywords,
  ]);
  const repoStructure = options.repoStructure || null;

  const maxFiles = Math.max(1, Math.min(Number(options.maxFiles || MAX_FILES), 5));
  const maxTotalLines = Math.max(120, Math.min(Number(options.maxTotalLines || MAX_TOTAL_LINES), 900));
  const maxLinesPerFile = Math.max(60, Math.min(Number(options.maxLinesPerFile || MAX_LINES_PER_FILE), 260));
  const searchResults = await Promise.all(
    keywords.slice(0, KEYWORD_LIMIT).map((keyword) =>
      searchCode(accessToken, owner, repo, keyword)
        .then((items) => items.map((item) => ({ ...item, matchedKeyword: keyword })))
        .catch(() => [])
    )
  );

  const merged = new Map();
  for (const resultSet of searchResults.flat()) {
    const existing = merged.get(resultSet.path);
    const nextScore = scorePath(resultSet.path, keywords, options.issueIntelligence || null);
    if (!existing || existing.score < nextScore) {
      merged.set(resultSet.path, {
        path: resultSet.path,
        score: nextScore,
        matchedKeyword: resultSet.matchedKeyword,
      });
    }
  }

  for (const path of Array.isArray(repoStructure?.keyFiles) ? repoStructure.keyFiles : []) {
    const existing = merged.get(path);
    const nextScore = scorePath(path, keywords, options.issueIntelligence || null) + 4;
    if (!existing || existing.score < nextScore) {
      merged.set(path, {
        path,
        score: nextScore,
        matchedKeyword: 'repo-structure',
      });
    }
  }

  const candidates = Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);

  let remainingBudget = maxTotalLines;
  const files = [];

  for (const candidate of candidates) {
    if (remainingBudget <= 0) {
      break;
    }

    try {
      const file = await fetchRepositoryFile(accessToken, owner, repo, candidate.path, ref);
      const maxLines = Math.min(maxLinesPerFile, remainingBudget);
      const snippet = buildSnippet(file.content, keywords, maxLines);
      remainingBudget -= snippet.lineCount;
      files.push({
        path: candidate.path,
        sha: file.sha,
        matchedKeyword: candidate.matchedKeyword,
        lineCount: snippet.lineCount,
        startLine: snippet.startLine,
        endLine: snippet.endLine,
        filePurpose: inferFilePurpose(candidate.path, snippet.snippet),
        matchStrength: computeMatchStrength(candidate.path, snippet.snippet, keywords),
        snippet: redactSensitiveContent(snippet.snippet),
      });
    } catch {
      // Skip inaccessible or overly large files.
    }
  }

  return {
    keywords,
    files,
    totalLines: files.reduce((sum, file) => sum + file.lineCount, 0),
  };
}

module.exports = {
  extractKeywords,
  fetchRepositoryFile,
  searchRelevantCode,
};
