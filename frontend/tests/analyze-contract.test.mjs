import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAnalyzeUrl, getSectionState, mapAnalyzePayload } from '../lib/analyzeContract.js';

test('mapAnalyzePayload maps canonical Wave 3 analyze envelope', () => {
  const payload = {
    issue_id: '123',
    analysis_version: 'w3-unified-v1',
    predicted_type: {
      label: 'bug',
      confidence: 0.91,
      reasons: ['contains crash wording'],
    },
    suggested_labels: {
      items: ['bug', 'needs-repro'],
      reasons: ['error trace present'],
    },
    duplicate_candidates: {
      confidence: 0.84,
      items: [
        {
          issue_id: '122',
          issue_number: 45,
          title: 'Crash on startup',
          html_url: 'https://github.com/org/repo/issues/45',
          similarity_score: 0.88,
          rerank_score: 0.82,
          final_score: 0.86,
          reasons: ['same stack trace'],
        },
      ],
    },
    priority: {
      score: 83,
      band: 'high',
      reasons: ['production impact'],
    },
    missing_information: {
      items: ['reproduction steps'],
    },
    explanation: {
      summary: 'Likely high priority crash duplicate',
      type_reasons: ['crash keyword'],
      label_reasons: ['bug conventions'],
      duplicate_reasons: ['same stack trace'],
      priority_reasons: ['production impact'],
      missing_information_reasons: ['needs reproduction steps'],
    },
  };

  const mapped = mapAnalyzePayload(payload);

  assert.equal(mapped.issueId, '123');
  assert.equal(mapped.analysisVersion, 'w3-unified-v1');
  assert.equal(mapped.predictedType.label, 'bug');
  assert.equal(mapped.predictedType.confidence, 0.91);
  assert.deepEqual(mapped.suggestedLabels.items, ['bug', 'needs-repro']);
  assert.equal(mapped.duplicateCandidates.confidence, 0.84);
  assert.equal(mapped.duplicateCandidates.items.length, 1);
  assert.equal(mapped.duplicateCandidates.items[0].primaryScore, 0.86);
  assert.equal(mapped.duplicateCandidates.items[0].primaryScoreKind, 'final');
  assert.equal(mapped.priority.score, 83);
  assert.equal(mapped.priority.band, 'high');
  assert.deepEqual(mapped.missingInformation.items, ['reproduction steps']);
  assert.equal(mapped.explanation.summary, 'Likely high priority crash duplicate');
});

test('mapAnalyzePayload supports legacy flat triage payload fallback', () => {
  const payload = {
    issue_id: 'legacy-1',
    analysis_version: 'v0',
    predicted_type: 'feature request',
    type_confidence: '0.66',
    similar_issues: [
      {
        issue_id: 'sim-2',
        issue_number: '9',
        title: 'Request configurable timeout',
        similarity_score: '0.51',
      },
    ],
    duplicate_confidence: 0.51,
    priority_score: 35,
    priority_band: 'medium',
    priority_reasons: ['customer impact medium'],
    suggested_labels: ['enhancement'],
    missing_information: ['target use-case details'],
    summary: 'Medium priority feature request',
  };

  const mapped = mapAnalyzePayload(payload);

  assert.equal(mapped.predictedType.label, 'feature request');
  assert.equal(mapped.predictedType.confidence, 0.66);
  assert.equal(mapped.duplicateCandidates.confidence, 0.51);
  assert.equal(mapped.duplicateCandidates.items[0].issueId, 'sim-2');
  assert.equal(mapped.duplicateCandidates.items[0].issueNumber, 9);
  assert.equal(mapped.duplicateCandidates.items[0].primaryScore, 0.51);
  assert.equal(mapped.priority.score, 35);
  assert.equal(mapped.priority.band, 'medium');
  assert.deepEqual(mapped.suggestedLabels.items, ['enhancement']);
  assert.deepEqual(mapped.missingInformation.items, ['target use-case details']);
  assert.equal(mapped.explanation.summary, 'Medium priority feature request');
});

test('mapAnalyzePayload supports analyze nested envelope', () => {
  const mapped = mapAnalyzePayload({
    analyze: {
      issue_id: 'nested-1',
      analysis_version: 'w3-unified-v1',
      predicted_type: { label: 'bug', confidence: 0.8, reasons: [] },
      suggested_labels: { items: [], reasons: [] },
      duplicate_candidates: { confidence: 0.0, items: [] },
      priority: { score: 20, band: 'low', reasons: [] },
      missing_information: { items: [] },
      explanation: {
        summary: 'No duplicate candidates found',
        type_reasons: [],
        label_reasons: [],
        duplicate_reasons: [],
        priority_reasons: [],
        missing_information_reasons: [],
      },
    },
  });

  assert.equal(mapped.issueId, 'nested-1');
  assert.equal(mapped.duplicateCandidates.items.length, 0);
  assert.equal(mapped.priority.band, 'low');
});

test('getSectionState returns loading, error, empty, ready', () => {
  assert.equal(getSectionState({ loading: true, error: null, items: [] }), 'loading');
  assert.equal(getSectionState({ loading: false, error: 'boom', items: [] }), 'error');
  assert.equal(getSectionState({ loading: false, error: null, items: [] }), 'empty');
  assert.equal(getSectionState({ loading: false, error: null, items: [{ id: 1 }] }), 'ready');
});

test('mapAnalyzePayload normalizes structured duplicate reasons', () => {
  const mapped = mapAnalyzePayload({
    issue_id: 'reason-1',
    predicted_type: { label: 'bug', confidence: 0.8, reasons: [] },
    suggested_labels: { items: [], reasons: [] },
    duplicate_candidates: {
      confidence: 0.5,
      items: [
        {
          issue_id: 'candidate-1',
          title: 'Sample duplicate',
          reasons: [{ signal: 'semantic_similarity', detail: 'MiniLM cosine similarity.', strength: 0.91 }],
        },
      ],
    },
    priority: { score: 40, band: 'medium', reasons: [] },
    missing_information: { items: [] },
    explanation: {
      summary: 'Test',
      type_reasons: [],
      label_reasons: [],
      duplicate_reasons: [],
      priority_reasons: [],
      missing_information_reasons: [],
    },
  });

  assert.equal(mapped.duplicateCandidates.items[0].reasons[0], 'semantic_similarity: MiniLM cosine similarity. (strength 0.91)');
});

test('buildAnalyzeUrl supports base and relative paths', () => {
  assert.equal(buildAnalyzeUrl('http://localhost:8000/'), 'http://localhost:8000/api/analyze');
  assert.equal(buildAnalyzeUrl(''), '/api/analyze');
});
