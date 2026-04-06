function toNumberOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toScoreOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickPrimaryScore(similarityScore, rerankScore, finalScore) {
  if (finalScore != null) return { score: finalScore, kind: 'final' };
  if (rerankScore != null) return { score: rerankScore, kind: 'rerank' };
  if (similarityScore != null) return { score: similarityScore, kind: 'similarity' };
  return { score: null, kind: null };
}

export function extractSimilarIssueCandidates(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.similar_issues)) return payload.similar_issues;
  if (payload.triage && Array.isArray(payload.triage.similar_issues)) {
    return payload.triage.similar_issues;
  }
  if (payload.result && Array.isArray(payload.result.similar_issues)) {
    return payload.result.similar_issues;
  }

  return [];
}

export function mapSimilarIssueCandidate(candidate, sourceRank = null) {
  if (!candidate || typeof candidate !== 'object') return null;

  const rawIssueId = candidate.issue_id ?? candidate.id ?? null;
  const issueNumber = toNumberOrNull(candidate.issue_number ?? candidate.number ?? null);
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const issueId = rawIssueId == null ? '' : String(rawIssueId).trim();

  if (!issueId || !title) return null;

  const similarityScore = toScoreOrNull(candidate.similarity_score);
  const rerankScore = toScoreOrNull(candidate.rerank_score);
  const finalScore = toScoreOrNull(candidate.final_score);
  const primary = pickPrimaryScore(similarityScore, rerankScore, finalScore);

  return {
    issueId,
    issueNumber,
    sourceRank: Number.isInteger(sourceRank) && sourceRank >= 0 ? sourceRank : null,
    title,
    htmlUrl: candidate.html_url ?? candidate.htmlUrl ?? null,
    similarityScore,
    rerankScore,
    finalScore,
    primaryScore: primary.score,
    primaryScoreKind: primary.kind,
    reasons: Array.isArray(candidate.reasons) ? candidate.reasons.filter((reason) => typeof reason === 'string') : [],
  };
}

export function extractSimilarityMetadata(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      analysisVersion: null,
      duplicateConfidence: null,
    };
  }

  const analysisVersion = typeof payload.analysis_version === 'string'
    ? payload.analysis_version
    : typeof payload?.triage?.analysis_version === 'string'
      ? payload.triage.analysis_version
      : typeof payload?.result?.analysis_version === 'string'
        ? payload.result.analysis_version
        : null;

  const duplicateConfidence = toScoreOrNull(
    payload.duplicate_confidence
      ?? payload?.triage?.duplicate_confidence
      ?? payload?.result?.duplicate_confidence
      ?? null
  );

  return {
    analysisVersion,
    duplicateConfidence,
  };
}

export function mapSimilarIssuesPayload(payload) {
  return extractSimilarIssueCandidates(payload)
    .map((candidate, index) => mapSimilarIssueCandidate(candidate, index))
    .filter(Boolean);
}
