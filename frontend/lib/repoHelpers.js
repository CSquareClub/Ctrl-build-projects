export function parseRepoInput(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '');

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  return { owner: parts[0], repo: parts[1] };
}

export function timeAgo(iso) {
  try {
    const delta = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (delta < 60) return `${delta}s ago`;
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  } catch {
    return iso;
  }
}

export function getStoredToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('gh_token') || '';
}

export function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function parseApiError(res) {
  try {
    const json = await res.json();
    const detail = json?.detail || json?.message;
    if (typeof detail === 'string' && detail.toLowerCase().includes('rate limit')) {
      return 'GitHub API rate limit exceeded. Add a token in the sidebar to get 5,000 req/hr.';
    }
    if (detail) return String(detail);
  } catch {
    // no-op: fallback to HTTP status message
  }

  return `Request failed (HTTP ${res.status})`;
}
