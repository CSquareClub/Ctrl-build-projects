const supabase = require('../lib/supabaseClient');

function isMissingRelationError(error) {
  return error?.code === '42P01' || error?.code === '42703';
}

function normalizeRepoValue(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function buildPrimaryRepoPayload(userId, input = {}) {
  const owner = normalizeRepoValue(input.owner);
  const name = normalizeRepoValue(input.name);
  return {
    user_id: userId,
    primary_repo: owner && name ? `${owner}/${name}` : null,
    branch: normalizeRepoValue(input.branch) || 'main',
    updated_at: new Date().toISOString(),
  };
}

function parsePrimaryRepoRecord(record) {
  const fullName = normalizeRepoValue(record?.primary_repo);
  const [owner = '', name = ''] = fullName.split('/');
  return {
    owner: owner || null,
    name: name || null,
    branch: normalizeRepoValue(record?.branch) || 'main',
    fullName: owner && name ? `${owner}/${name}` : null,
  };
}

async function getPrimaryRepoSetting(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('primary_repo, branch')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }

  const parsed = parsePrimaryRepoRecord(data);
  return parsed.owner && parsed.name ? parsed : null;
}

async function savePrimaryRepoSetting(userId, input) {
  const payload = buildPrimaryRepoPayload(userId, input);
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('primary_repo, branch')
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      return parsePrimaryRepoRecord(payload);
    }
    throw error;
  }

  return parsePrimaryRepoRecord(data);
}

module.exports = {
  getPrimaryRepoSetting,
  savePrimaryRepoSetting,
};
