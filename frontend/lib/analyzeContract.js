function toNumberOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeReasonItems(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';

      const signal = toStringOrEmpty(item.signal);
      const detail = toStringOrEmpty(item.detail);
      const strength = toNumberOrNull(item.strength);

      if (signal && detail && strength != null) {
        return `${signal}: ${detail} (strength ${strength.toFixed(2)})`;
      }
      if (signal && detail) return `${signal}: ${detail}`;
      if (detail) return detail;
      if (signal) return signal;
      return '';
    })
    .filter(Boolean);
}

function dedupe(items) {
  return [...new Set(items)];
}

function pickPrimaryScore(similarityScore, rerankScore, finalScore) {
  if (finalScore != null) return { score: finalScore, kind: 'final' };
  if (rerankScore != null) return { score: rerankScore, kind: 'rerank' };
  if (similarityScore != null) return { score: similarityScore, kind: 'similarity' };
  return { score: null, kind: null };
}

function resolveAnalyzeEnvelope(payload) {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.analyze && typeof payload.analyze === 'object') return payload.analyze;
  return payload;
}

function mapPredictedType(envelope) {
  const section = envelope.predicted_type;

  if (section && typeof section === 'object' && !Array.isArray(section)) {
    return {
      label: toStringOrEmpty(section.label),
      confidence: toNumberOrNull(section.confidence),
      reasons: toStringArray(section.reasons),
    };
  }

  return {
    label: toStringOrEmpty(envelope.predicted_type),
    confidence: toNumberOrNull(envelope.type_confidence),
    reasons: toStringArray(envelope.type_reasons),
  };
}

function mapSuggestedLabels(envelope) {
  const section = envelope.suggested_labels;

  if (section && typeof section === 'object' && !Array.isArray(section)) {
    return {
      items: toStringArray(section.items),
      reasons: toStringArray(section.reasons),
    };
  }

  return {
    items: toStringArray(envelope.suggested_labels),
    reasons: toStringArray(envelope.label_reasons),
  };
}

function mapDuplicateCandidate(candidate, sourceRank = null) {
  if (!candidate || typeof candidate !== 'object') return null;

  const issueIdRaw = candidate.issue_id ?? candidate.id ?? null;
  const issueId = issueIdRaw == null ? '' : String(issueIdRaw).trim();
  const title = toStringOrEmpty(candidate.title);
  if (!issueId || !title) return null;

  const similarityScore = toNumberOrNull(candidate.similarity_score);
  const rerankScore = toNumberOrNull(candidate.rerank_score);
  const finalScore = toNumberOrNull(candidate.final_score);
  const primary = pickPrimaryScore(similarityScore, rerankScore, finalScore);

  return {
    issueId,
    issueNumber: toNumberOrNull(candidate.issue_number ?? candidate.number ?? null),
    title,
    htmlUrl: candidate.html_url ?? candidate.htmlUrl ?? null,
    similarityScore,
    rerankScore,
    finalScore,
    primaryScore: primary.score,
    primaryScoreKind: primary.kind,
    reasons: normalizeReasonItems(candidate.reasons),
    sourceRank: Number.isInteger(sourceRank) && sourceRank >= 0 ? sourceRank : null,
  };
}

function mapDuplicateCandidates(envelope) {
  const section = envelope.duplicate_candidates;

  if (section && typeof section === 'object' && !Array.isArray(section)) {
    const items = Array.isArray(section.items) ? section.items : [];
    return {
      confidence: toNumberOrNull(section.confidence),
      items: items
        .map((item, index) => mapDuplicateCandidate(item, index))
        .filter(Boolean),
    };
  }

  const fallback = Array.isArray(envelope.similar_issues) ? envelope.similar_issues : [];
  return {
    confidence: toNumberOrNull(envelope.duplicate_confidence),
    items: fallback
      .map((item, index) => mapDuplicateCandidate(item, index))
      .filter(Boolean),
  };
}

function mapPriority(envelope) {
  const section = envelope.priority;

  if (section && typeof section === 'object' && !Array.isArray(section)) {
    return {
      score: toNumberOrNull(section.score),
      band: toStringOrEmpty(section.band),
      reasons: toStringArray(section.reasons),
    };
  }

  return {
    score: toNumberOrNull(envelope.priority_score),
    band: toStringOrEmpty(envelope.priority_band),
    reasons: toStringArray(envelope.priority_reasons),
  };
}

function mapMissingInformation(envelope) {
  const section = envelope.missing_information;

  if (section && typeof section === 'object' && !Array.isArray(section)) {
    return {
      items: toStringArray(section.items),
    };
  }

  return {
    items: toStringArray(envelope.missing_information),
  };
}

function mapExplanation(envelope, predictedType, suggestedLabels, duplicateCandidates, priority, missingInformation) {
  const section = envelope.explanation;

  if (section && typeof section === 'object' && !Array.isArray(section)) {
    return {
      summary: toStringOrEmpty(section.summary),
      typeReasons: toStringArray(section.type_reasons),
      labelReasons: toStringArray(section.label_reasons),
      duplicateReasons: toStringArray(section.duplicate_reasons),
      priorityReasons: toStringArray(section.priority_reasons),
      missingInformationReasons: toStringArray(section.missing_information_reasons),
    };
  }

  return {
    summary: toStringOrEmpty(envelope.summary),
    typeReasons: toStringArray(envelope.type_reasons).length
      ? toStringArray(envelope.type_reasons)
      : predictedType.reasons,
    labelReasons: toStringArray(envelope.label_reasons).length
      ? toStringArray(envelope.label_reasons)
      : suggestedLabels.reasons,
    duplicateReasons: dedupe(
      duplicateCandidates.items.flatMap((candidate) => candidate.reasons)
    ),
    priorityReasons: toStringArray(envelope.priority_reasons).length
      ? toStringArray(envelope.priority_reasons)
      : priority.reasons,
    missingInformationReasons: missingInformation.items,
  };
}

export function mapAnalyzePayload(payload) {
  const envelope = resolveAnalyzeEnvelope(payload);

  const predictedType = mapPredictedType(envelope);
  const suggestedLabels = mapSuggestedLabels(envelope);
  const duplicateCandidates = mapDuplicateCandidates(envelope);
  const priority = mapPriority(envelope);
  const missingInformation = mapMissingInformation(envelope);
  const explanation = mapExplanation(
    envelope,
    predictedType,
    suggestedLabels,
    duplicateCandidates,
    priority,
    missingInformation
  );

  return {
    issueId: toStringOrEmpty(envelope.issue_id),
    analysisVersion: toStringOrEmpty(envelope.analysis_version),
    predictedType,
    suggestedLabels,
    duplicateCandidates,
    priority,
    missingInformation,
    explanation,
  };
}

export function buildAnalyzeUrl(apiBaseUrl) {
  const base = (apiBaseUrl || '').replace(/\/$/, '');
  const path = '/api/analyze';
  if (!base) return path;
  return `${base}${path}`;
}

export function getSectionState({ loading = false, error = null, items = null }) {
  if (loading) return 'loading';
  if (error) return 'error';
  if (Array.isArray(items) && items.length === 0) return 'empty';
  return 'ready';
}
