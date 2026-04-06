function withBase(apiBaseUrl, path) {
  const base = (apiBaseUrl || '').replace(/\/$/, '');
  if (!base) return path;
  return `${base}${path}`;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickFirst(source, keys, fallback = null) {
  for (const key of keys) {
    if (source && source[key] != null) return source[key];
  }
  return fallback;
}

export function buildAnalyzeCandidates(apiBaseUrl, owner, repo, issueNumber) {
  const body = JSON.stringify({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return ['/api/analyze', '/api/triage/analyze'].map((path) => ({
    url: withBase(apiBaseUrl, path),
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
  }));
}

export function buildSimilarCandidates(apiBaseUrl, owner, repo, issueNumber) {
  return ['/api/similar', '/api/triage/similar'].map((path) => {
    const params = new URLSearchParams({
      owner,
      repo,
      issue_number: String(issueNumber),
      k: '5',
    });

    return {
      url: `${withBase(apiBaseUrl, path)}?${params.toString()}`,
      options: { method: 'GET' },
    };
  });
}

export function mapSimilarIssueCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;

  const issueNumber = pickFirst(candidate, ['issue_number', 'issueNumber'], null);
  const title = pickFirst(candidate, ['title'], 'Untitled issue');

  return {
    issueId: pickFirst(candidate, ['issue_id', 'issueId', 'id'], String(issueNumber || title)),
    issueNumber,
    title,
    htmlUrl: pickFirst(candidate, ['html_url', 'htmlUrl', 'url'], null),
    similarityScore: toNumber(pickFirst(candidate, ['similarity_score', 'similarityScore'], 0), 0),
    rerankScore: toNumber(pickFirst(candidate, ['rerank_score', 'rerankScore'], 0), 0),
    finalScore: toNumber(pickFirst(candidate, ['final_score', 'finalScore'], 0), 0),
    reasons: toStringArray(pickFirst(candidate, ['reasons'], [])),
  };
}

export function extractSimilarCandidates(payload) {
  if (Array.isArray(payload)) return payload.map(mapSimilarIssueCandidate).filter(Boolean);

  const source = pickFirst(payload, ['similar_issues', 'similarIssues', 'items', 'candidates', 'data'], []);
  if (!Array.isArray(source)) return [];
  return source.map(mapSimilarIssueCandidate).filter(Boolean);
}

export function mapTriageResult(payload, issueNumber) {
  const source = pickFirst(payload, ['triage', 'analysis', 'result'], payload || {});

  const similarIssues = extractSimilarCandidates(
    pickFirst(source, ['similar_issues', 'similarIssues'], source)
  );

  return {
    issueId: pickFirst(source, ['issue_id', 'issueId'], String(issueNumber || 'unknown')),
    predictedType: pickFirst(source, ['predicted_type', 'predictedType'], 'unknown'),
    typeConfidence: toNumber(pickFirst(source, ['type_confidence', 'typeConfidence'], 0), 0),
    priorityScore: toNumber(pickFirst(source, ['priority_score', 'priorityScore'], 0), 0),
    priorityBand: pickFirst(source, ['priority_band', 'priorityBand'], 'unassigned'),
    priorityReasons: toStringArray(pickFirst(source, ['priority_reasons', 'priorityReasons'], [])),
    duplicateConfidence: toNumber(pickFirst(source, ['duplicate_confidence', 'duplicateConfidence'], 0), 0),
    suggestedLabels: toStringArray(pickFirst(source, ['suggested_labels', 'suggestedLabels'], [])),
    missingInformation: toStringArray(pickFirst(source, ['missing_information', 'missingInformation'], [])),
    summary: pickFirst(source, ['summary'], 'No triage summary returned.'),
    analysisVersion: pickFirst(source, ['analysis_version', 'analysisVersion'], 'v0'),
    similarIssues,
  };
}
