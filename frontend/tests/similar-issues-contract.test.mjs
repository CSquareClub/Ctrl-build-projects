import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractSimilarIssueCandidates,
  extractSimilarityMetadata,
  mapSimilarIssueCandidate,
  mapSimilarIssuesPayload,
} from '../lib/similarIssuesContract.js';

test('extractSimilarIssueCandidates supports root and nested envelopes', () => {
  const root = {
    similar_issues: [{ issue_id: '1', title: 'Root' }],
  };

  const nestedTriage = {
    triage: {
      similar_issues: [{ issue_id: '2', title: 'Nested triage' }],
    },
  };

  const nestedResult = {
    result: {
      similar_issues: [{ issue_id: '3', title: 'Nested result' }],
    },
  };

  assert.equal(extractSimilarIssueCandidates(root).length, 1);
  assert.equal(extractSimilarIssueCandidates(nestedTriage).length, 1);
  assert.equal(extractSimilarIssueCandidates(nestedResult).length, 1);
  assert.deepEqual(extractSimilarIssueCandidates(null), []);
});

test('mapSimilarIssueCandidate maps backend schema fields', () => {
  const mapped = mapSimilarIssueCandidate({
    issue_id: 'abc-123',
    issue_number: 47,
    title: 'Crash on startup',
    html_url: 'https://github.com/org/repo/issues/47',
    similarity_score: 0.82,
    rerank_score: 0.74,
    final_score: 0.79,
    reasons: ['same stacktrace', 'same module path'],
  });

  assert.deepEqual(mapped, {
    issueId: 'abc-123',
    issueNumber: 47,
    sourceRank: null,
    title: 'Crash on startup',
    htmlUrl: 'https://github.com/org/repo/issues/47',
    similarityScore: 0.82,
    rerankScore: 0.74,
    finalScore: 0.79,
    primaryScore: 0.79,
    primaryScoreKind: 'final',
    reasons: ['same stacktrace', 'same module path'],
  });
});

test('mapSimilarIssueCandidate supports fallback id/number fields', () => {
  const mapped = mapSimilarIssueCandidate({
    id: 'legacy-id',
    number: '99',
    title: 'Legacy envelope candidate',
  });

  assert.equal(mapped.issueId, 'legacy-id');
  assert.equal(mapped.issueNumber, 99);
  assert.equal(mapped.sourceRank, null);
  assert.equal(mapped.finalScore, null);
  assert.equal(mapped.primaryScore, null);
  assert.equal(mapped.primaryScoreKind, null);
  assert.deepEqual(mapped.reasons, []);
});

test('mapSimilarIssueCandidate uses best available score when final is absent', () => {
  const mapped = mapSimilarIssueCandidate({
    issue_id: 'score-fallback',
    title: 'No final score candidate',
    similarity_score: 0.63,
  });

  assert.equal(mapped.similarityScore, 0.63);
  assert.equal(mapped.rerankScore, null);
  assert.equal(mapped.finalScore, null);
  assert.equal(mapped.primaryScore, 0.63);
  assert.equal(mapped.primaryScoreKind, 'similarity');
});

test('mapSimilarIssueCandidate filters invalid candidates', () => {
  assert.equal(mapSimilarIssueCandidate({ title: 'Missing id' }), null);
  assert.equal(mapSimilarIssueCandidate({ issue_id: 'id-only' }), null);
  assert.equal(mapSimilarIssueCandidate(null), null);
});

test('mapSimilarIssuesPayload maps and filters candidates', () => {
  const mapped = mapSimilarIssuesPayload({
    similar_issues: [
      { issue_id: 'a', issue_number: 1, title: 'Good candidate', final_score: 0.9 },
      { issue_id: 'b' },
      { title: 'No id' },
    ],
  });

  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].issueId, 'a');
  assert.equal(mapped[0].issueNumber, 1);
  assert.equal(mapped[0].sourceRank, 0);
  assert.equal(mapped[0].finalScore, 0.9);
  assert.equal(mapped[0].primaryScore, 0.9);
  assert.equal(mapped[0].primaryScoreKind, 'final');
});

test('extractSimilarityMetadata returns stable triage metadata fields', () => {
  const root = extractSimilarityMetadata({
    analysis_version: 'v2-minilm',
    duplicate_confidence: 0.88,
  });

  const nested = extractSimilarityMetadata({
    triage: {
      analysis_version: 'v2-minilm-nested',
      duplicate_confidence: '0.71',
    },
  });

  const empty = extractSimilarityMetadata({});

  assert.deepEqual(root, {
    analysisVersion: 'v2-minilm',
    duplicateConfidence: 0.88,
  });

  assert.deepEqual(nested, {
    analysisVersion: 'v2-minilm-nested',
    duplicateConfidence: 0.71,
  });

  assert.deepEqual(empty, {
    analysisVersion: null,
    duplicateConfidence: null,
  });
});
