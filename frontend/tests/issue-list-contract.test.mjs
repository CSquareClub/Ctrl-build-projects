import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIssueListUrl,
  extractIssueSummaries,
  mapIssueListPayloadToCardIssues,
  mapIssueSummaryToCardIssue,
} from '../lib/issueListContract.js';

const fixedTimeAgo = () => 'just now';

test('extractIssueSummaries supports raw and wrapped shapes', () => {
  const raw = [{ id: 1 }];
  const wrappedIssues = { issues: [{ id: 2 }] };
  const wrappedItems = { items: [{ id: 3 }] };
  const wrappedData = { data: [{ id: 4 }] };
  const invalid = { hello: 'world' };

  assert.deepEqual(extractIssueSummaries(raw), [{ id: 1 }]);
  assert.deepEqual(extractIssueSummaries(wrappedIssues), [{ id: 2 }]);
  assert.deepEqual(extractIssueSummaries(wrappedItems), [{ id: 3 }]);
  assert.deepEqual(extractIssueSummaries(wrappedData), [{ id: 4 }]);
  assert.deepEqual(extractIssueSummaries(invalid), []);
  assert.deepEqual(extractIssueSummaries(null), []);
});

test('mapIssueSummaryToCardIssue maps backend snake_case fields', () => {
  const mapped = mapIssueSummaryToCardIssue(
    {
      id: 'abc',
      number: 42,
      title: 'Crash when opening settings',
      state: 'closed',
      created_at: '2026-04-01T00:00:00Z',
      html_url: 'https://github.com/org/repo/issues/42',
      labels: ['bug'],
      author: 'maintainer',
      comment_count: 5,
    },
    fixedTimeAgo
  );

  assert.deepEqual(mapped, {
    id: 'abc',
    number: 42,
    title: 'Crash when opening settings',
    state: 'closed',
    createdAt: 'just now',
    createdAtIso: '2026-04-01T00:00:00Z',
    htmlUrl: 'https://github.com/org/repo/issues/42',
    labels: ['bug'],
    author: 'maintainer',
    commentCount: 5,
  });
});

test('mapIssueSummaryToCardIssue supports issue_id and issue_number fallback', () => {
  const mapped = mapIssueSummaryToCardIssue(
    {
      issue_id: 'def',
      issue_number: 7,
      title: 'Feature request: add labels',
      state: 'open',
      updated_at: '2026-04-02T00:00:00Z',
    },
    fixedTimeAgo
  );

  assert.equal(mapped.id, 'def');
  assert.equal(mapped.number, 7);
  assert.equal(mapped.state, 'open');
  assert.equal(mapped.createdAt, 'just now');
  assert.equal(mapped.createdAtIso, '2026-04-02T00:00:00Z');
});

test('mapIssueSummaryToCardIssue filters pull requests and invalid issues', () => {
  assert.equal(mapIssueSummaryToCardIssue({ pull_request: {} }, fixedTimeAgo), null);
  assert.equal(mapIssueSummaryToCardIssue({ number: 1 }, fixedTimeAgo), null);
  assert.equal(mapIssueSummaryToCardIssue({ title: 'Missing number' }, fixedTimeAgo), null);
});

test('mapIssueListPayloadToCardIssues filters invalid entries', () => {
  const mapped = mapIssueListPayloadToCardIssues(
    {
      issues: [
        { id: 1, number: 1, title: 'One', state: 'open', created_at: '2026-04-01T00:00:00Z' },
        { pull_request: {}, number: 2, title: 'Should be filtered' },
        { title: 'Invalid no number' },
      ],
    },
    fixedTimeAgo
  );

  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].number, 1);
  assert.equal(mapped[0].title, 'One');
});

test('buildIssueListUrl builds relative and absolute URLs', () => {
  assert.equal(buildIssueListUrl('', 'openai', 'openissue'), '/api/issues?repo=openai%2Fopenissue');
  assert.equal(
    buildIssueListUrl('http://localhost:8000/', 'openai', 'openissue'),
    'http://localhost:8000/api/issues?repo=openai%2Fopenissue'
  );
});
