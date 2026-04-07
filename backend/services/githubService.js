const crypto = require('crypto');
const supabase = require('../lib/supabaseClient');
const { encryptSecret, decryptSecret } = require('../lib/credentialCipher');
const {
  getPrimaryRepoSetting,
  savePrimaryRepoSetting,
} = require('./primaryRepoService');

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_SCOPES = ['repo', 'read:user', 'user:email'];
const GITHUB_SPECIAL_USERNAME = 'gajabgamer';

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getAppUrl() {
  return normalizeUrl(process.env.APP_URL || 'http://localhost:3000');
}

function getBackendUrl() {
  return normalizeUrl(
    process.env.BACKEND_URL ||
      process.env.API_URL ||
      process.env.PUBLIC_BACKEND_URL ||
      'http://localhost:8000'
  );
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in backend environment.`);
  }
  return value;
}

function getPreferredGitHubToken(row) {
  const storedToken = decryptSecret(row.access_token);
  const username = String(row?.metadata?.username || '').trim().toLowerCase();
  const specialToken = String(process.env.GITHUB_GAJABGAMER_PAT || '').trim();

  if (username === GITHUB_SPECIAL_USERNAME && specialToken) {
    return specialToken;
  }

  return storedToken;
}

function getGitHubRedirectUri() {
  return (
    process.env.GITHUB_REDIRECT_URI ||
    'https://qvafeexkjmylncaeisri.supabase.co/auth/v1/callback'
  );
}

function getStateSecret() {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'product-pulse-oauth-state'
  );
}

function signState(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const signature = crypto
    .createHmac('sha256', getStateSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifyState(token) {
  const [encodedPayload, signature] = String(token || '').split('.');

  if (!encodedPayload || !signature) {
    throw new Error('Invalid GitHub OAuth state.');
  }

  const expected = crypto
    .createHmac('sha256', getStateSecret())
    .update(encodedPayload)
    .digest('base64url');

  if (signature !== expected) {
    throw new Error('GitHub OAuth state signature mismatch.');
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8')
  );

  if (!payload.userId || !payload.redirectTo) {
    throw new Error('GitHub OAuth state is incomplete.');
  }

  return payload;
}

function createGitHubAuthUrl({ userId, redirectTo }) {
  const state = signState({
    userId,
    redirectTo: normalizeUrl(redirectTo) || `${getAppUrl()}/dashboard/github`,
    createdAt: Date.now(),
    provider: 'github',
  });

  const params = new URLSearchParams({
    client_id: getRequiredEnv('GITHUB_CLIENT_ID'),
    redirect_uri: getGitHubRedirectUri(),
    scope: GITHUB_SCOPES.join(' '),
    state,
  });

  return `${GITHUB_OAUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: getRequiredEnv('GITHUB_CLIENT_ID'),
      client_secret: getRequiredEnv('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: getGitHubRedirectUri(),
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(
      data.error_description || data.error || 'GitHub token exchange failed.'
    );
  }

  return data;
}

async function githubRequest(accessToken, path, options = {}) {
  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'ProductPulse-GitHub-Agent',
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      (typeof data === 'string' ? data : null) ||
      `GitHub API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

async function fetchGitHubProfile(accessToken) {
  return githubRequest(accessToken, '/user');
}

async function listRepositories(accessToken, page = 1) {
  const params = new URLSearchParams({
    per_page: '100',
    page: String(page),
    sort: 'updated',
  });

  return githubRequest(accessToken, `/user/repos?${params.toString()}`);
}

async function listRepositoriesForUser(userId) {
  const connection = await getGitHubConnection(userId);
  if (!connection) {
    throw new Error('Connect GitHub before listing repositories.');
  }

  const repos = await listRepositories(connection.accessToken);
  return repos.map((repo) => ({
    id: repo.id,
    owner: repo.owner?.login,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch,
    permissions: repo.permissions || {},
    updatedAt: repo.updated_at,
  }));
}

async function getRepository(accessToken, owner, repo) {
  return githubRequest(accessToken, `/repos/${owner}/${repo}`);
}

async function getRepositoryTree(accessToken, owner, repo, ref = 'main') {
  try {
    const result = await githubRequest(
      accessToken,
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
    );

    return Array.isArray(result?.tree)
      ? result.tree.filter((entry) => entry?.type === 'blob')
      : [];
  } catch (error) {
    if (ref !== 'main') {
      const fallback = await githubRequest(
        accessToken,
        `/repos/${owner}/${repo}/git/trees/main?recursive=1`
      );
      return Array.isArray(fallback?.tree)
        ? fallback.tree.filter((entry) => entry?.type === 'blob')
        : [];
    }
    throw error;
  }
}

async function getGitHubConnectionRow(userId) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getGitHubConnection(userId) {
  const row = await getGitHubConnectionRow(userId);
  if (!row) {
    return null;
  }

  const primaryRepo = await getPrimaryRepoSetting(userId).catch(() => null);

  return {
    ...row,
    accessToken: getPreferredGitHubToken(row),
    repoOwner: primaryRepo?.owner || row.metadata?.repo_owner || null,
    repoName: primaryRepo?.name || row.metadata?.repo_name || null,
    defaultBranch:
      primaryRepo?.branch || row.metadata?.default_branch || null,
    primaryRepo,
  };
}

async function getGitHubConnectionByRepository(repoOwner, repoName) {
  const owner = String(repoOwner || '').trim();
  const name = String(repoName || '').trim();
  if (!owner || !name) {
    return null;
  }

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('provider', 'github')
    .eq('metadata->>repo_owner', owner)
    .eq('metadata->>repo_name', name)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const primaryRepo = await getPrimaryRepoSetting(data.user_id).catch(() => null);

  return {
    ...data,
    accessToken: getPreferredGitHubToken(data),
    repoOwner: primaryRepo?.owner || data.metadata?.repo_owner || null,
    repoName: primaryRepo?.name || data.metadata?.repo_name || null,
    defaultBranch:
      primaryRepo?.branch || data.metadata?.default_branch || null,
    primaryRepo,
  };
}

async function upsertGitHubConnection(userId, payload) {
  const encryptedAccessToken = encryptSecret(payload.accessToken);
  const { data, error } = await supabase
    .from('connected_accounts')
    .upsert(
      {
        user_id: userId,
        provider: 'github',
        access_token: encryptedAccessToken,
        refresh_token: null,
        metadata: {
          username: payload.profile?.login || null,
          name: payload.profile?.name || null,
          avatar_url: payload.profile?.avatar_url || null,
          repo_owner: payload.repoOwner || null,
          repo_name: payload.repoName || null,
          default_branch: payload.defaultBranch || null,
          connectedAt: new Date().toISOString(),
        },
        status: 'connected',
        last_error: null,
      },
      { onConflict: 'user_id, provider' }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function setSelectedRepository(userId, repoOwner, repoName) {
  const connection = await getGitHubConnection(userId);
  if (!connection) {
    throw new Error('Connect GitHub before selecting a repository.');
  }

  const repository = await getRepository(connection.accessToken, repoOwner, repoName);

  const { data, error } = await supabase
    .from('connected_accounts')
    .update({
      metadata: {
        ...(connection.metadata || {}),
        username: connection.metadata?.username || repository.owner?.login || null,
        repo_owner: repository.owner?.login || repoOwner,
        repo_name: repository.name || repoName,
        default_branch: repository.default_branch || 'main',
        repository_updated_at: new Date().toISOString(),
      },
      status: 'connected',
      last_error: null,
    })
    .eq('id', connection.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await savePrimaryRepoSetting(userId, {
    owner: data.metadata?.repo_owner || repoOwner,
    name: data.metadata?.repo_name || repoName,
    branch: data.metadata?.default_branch || 'main',
  }).catch(() => null);

  return {
    owner: data.metadata?.repo_owner || null,
    name: data.metadata?.repo_name || null,
    defaultBranch: data.metadata?.default_branch || null,
  };
}

async function getSelectedRepository(userId) {
  const connection = await getGitHubConnection(userId);
  if (!connection) {
    throw new Error('Connect GitHub before using the patch agent.');
  }

  if (!connection.repoOwner || !connection.repoName) {
    throw new Error('Select a GitHub repository before using the patch agent.');
  }

  return {
    connection,
    owner: connection.repoOwner,
    name: connection.repoName,
    defaultBranch: connection.defaultBranch || 'main',
  };
}

async function getPrimaryRepo(userId) {
  return getSelectedRepository(userId);
}

async function getGithubToken(userId) {
  const connection = await getGitHubConnection(userId);
  return connection?.accessToken || null;
}

module.exports = {
  createGitHubAuthUrl,
  exchangeCodeForToken,
  fetchGitHubProfile,
  getGithubToken,
  getGitHubConnection,
  getGitHubConnectionByRepository,
  getGitHubConnectionRow,
  getPrimaryRepo,
  getRepository,
  getRepositoryTree,
  getSelectedRepository,
  getGitHubRedirectUri,
  githubRequest,
  listRepositoriesForUser,
  setSelectedRepository,
  upsertGitHubConnection,
  verifyState,
};
