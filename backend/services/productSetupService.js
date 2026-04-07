const supabase = require('../lib/supabaseClient');
const { getGitHubConnection } = require('./githubService');

function isMissingRelationError(error) {
  return error?.code === '42P01' || error?.code === '42703';
}

function suggestProductName(repoName) {
  const raw = String(repoName || '').trim();
  if (!raw) return '';
  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function normalizeInspectionAccess(setup) {
  const loginUrl = String(setup?.inspection_login_url || '').trim();
  const username = String(setup?.inspection_username || '').trim();
  const postLoginSelector = String(setup?.inspection_post_login_selector || '').trim();
  const passwordConfigured = Boolean(String(setup?.inspection_password || '').trim());

  return {
    enabled: Boolean(loginUrl && username && passwordConfigured),
    loginUrl,
    username,
    postLoginSelector,
    passwordConfigured,
  };
}

async function getProductSetup(userId) {
  const { data, error } = await supabase
    .from('product_setup')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }

  return data || null;
}

async function getProductSetupStatus(user) {
  const [setup, githubConnection] = await Promise.all([
    getProductSetup(user.id),
    getGitHubConnection(user.id).catch(() => null),
  ]);

  const repoOwner =
    setup?.repo_owner ||
    githubConnection?.repoOwner ||
    githubConnection?.metadata?.repo_owner ||
    null;
  const repoName =
    setup?.repo_name ||
    githubConnection?.repoName ||
    githubConnection?.metadata?.repo_name ||
    null;
  const suggestedProductName = suggestProductName(repoName);
  const productName = setup?.product_name || suggestedProductName || '';
  const websiteUrl = String(setup?.website_url || '').trim();
  const inspectionAccess = normalizeInspectionAccess(setup);

  return {
    complete: Boolean(productName || websiteUrl || inspectionAccess.enabled || (repoOwner && repoName)),
    productName,
    websiteUrl,
    inspectionAccess,
    suggestedProductName,
    repository: repoOwner && repoName
      ? {
          owner: repoOwner,
          name: repoName,
        }
      : null,
    githubConnected: Boolean(githubConnection),
  };
}

async function saveProductSetup(userId, input) {
  const payload = {
    user_id: userId,
    product_name: String(input.productName || '').trim(),
    website_url: String(input.websiteUrl || '').trim(),
    inspection_login_url: String(input.inspectionLoginUrl || '').trim(),
    inspection_username: String(input.inspectionUsername || '').trim(),
    inspection_password: String(input.inspectionPassword || '').trim(),
    inspection_post_login_selector: String(input.inspectionPostLoginSelector || '').trim(),
    repo_owner: String(input.repoOwner || '').trim(),
    repo_name: String(input.repoName || '').trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('product_setup')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  getProductSetup,
  getProductSetupStatus,
  normalizeInspectionAccess,
  saveProductSetup,
  suggestProductName,
};
