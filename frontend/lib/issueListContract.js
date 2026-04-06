export function extractIssueSummaries(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.issues)) return payload.issues;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;

  return [];
}

function toIssueState(value) {
  return value === 'closed' ? 'closed' : 'open';
}

export function mapIssueSummaryToCardIssue(issueSummary, timeAgo) {
  if (!issueSummary || typeof issueSummary !== 'object') return null;
  if (issueSummary.pull_request) return null;

  const number = issueSummary.number ?? issueSummary.issue_number;
  const title = issueSummary.title ?? '';
  if (number == null || !title) return null;

  const createdAtIso = issueSummary.created_at ?? issueSummary.createdAt ?? issueSummary.updated_at ?? null;

  return {
    id: issueSummary.id ?? issueSummary.issue_id ?? `${number}-${title}`,
    number,
    title,
    state: toIssueState(issueSummary.state),
    createdAt: createdAtIso ? timeAgo(createdAtIso) : 'Unknown',
    createdAtIso,
    htmlUrl: issueSummary.html_url ?? issueSummary.htmlUrl ?? null,
    labels: Array.isArray(issueSummary.labels) ? issueSummary.labels : [],
    author: issueSummary.author ?? null,
    commentCount: issueSummary.comment_count ?? issueSummary.commentCount ?? null,
  };
}

export function mapIssueListPayloadToCardIssues(payload, timeAgo) {
  return extractIssueSummaries(payload)
    .map((issueSummary) => mapIssueSummaryToCardIssue(issueSummary, timeAgo))
    .filter(Boolean);
}

export function buildIssueListUrl(apiBaseUrl, owner, repo) {
  const base = (apiBaseUrl || '').replace(/\/$/, '');
  const path = '/api/issues';
  const search = new URLSearchParams({ repo: `${owner}/${repo}` }).toString();
  if (!base) return `${path}?${search}`;
  return `${base}${path}?${search}`;
}
