const supabase = require('../lib/supabaseClient');
const { getProductSetup } = require('./productSetupService');

const DEFAULT_AGENT_SETTINGS = {
  enabled: true,
  aggressiveness: 65,
  inspectionFrequency: 'realtime',
};

const DEFAULT_PRIVACY_SETTINGS = {
  dataRetention: '90',
  anonymizeFeedback: false,
};

function isMissingRelationError(error) {
  return error?.code === '42P01' || error?.code === '42703';
}

async function getProductSettings(userId) {
  const { data, error } = await supabase
    .from('product_setup')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        productName: '',
        companyName: '',
        description: '',
        industry: '',
        teamSize: '',
        websiteUrl: '',
      };
    }
    throw error;
  }

  return {
    productName: String(data?.product_name || ''),
    companyName: String(data?.company_name || ''),
    description: String(data?.description || ''),
    industry: String(data?.industry || ''),
    teamSize: String(data?.team_size || ''),
    websiteUrl: String(data?.website_url || ''),
  };
}

async function saveProductSettings(userId, input) {
  const existingSetup = await getProductSetup(userId).catch(() => null);
  const payload = {
    user_id: userId,
    product_name: String(input.productName || '').trim(),
    company_name: String(input.companyName || '').trim(),
    description: String(input.description || '').trim(),
    industry: String(input.industry || '').trim(),
    team_size: String(input.teamSize || '').trim(),
    website_url: String(input.websiteUrl || '').trim(),
    repo_owner: String(existingSetup?.repo_owner || '').trim(),
    repo_name: String(existingSetup?.repo_name || '').trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('product_setup')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;

  return {
    productName: String(data?.product_name || ''),
    companyName: String(data?.company_name || ''),
    description: String(data?.description || ''),
    industry: String(data?.industry || ''),
    teamSize: String(data?.team_size || ''),
    websiteUrl: String(data?.website_url || ''),
  };
}

async function getAgentSettings(userId) {
  const { data, error } = await supabase
    .from('agent_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { ...DEFAULT_AGENT_SETTINGS };
    }
    throw error;
  }

  return {
    enabled:
      typeof data?.autonomous_actions_enabled === 'boolean'
        ? data.autonomous_actions_enabled
        : DEFAULT_AGENT_SETTINGS.enabled,
    aggressiveness:
      typeof data?.aggressiveness === 'number'
        ? data.aggressiveness
        : DEFAULT_AGENT_SETTINGS.aggressiveness,
    inspectionFrequency:
      typeof data?.inspection_frequency === 'string' && data.inspection_frequency
        ? data.inspection_frequency
        : DEFAULT_AGENT_SETTINGS.inspectionFrequency,
  };
}

async function saveAgentSettings(userId, input) {
  const payload = {
    user_id: userId,
    autonomous_actions_enabled:
      typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_AGENT_SETTINGS.enabled,
    aggressiveness:
      Number.isFinite(Number(input.aggressiveness))
        ? Math.max(0, Math.min(100, Number(input.aggressiveness)))
        : DEFAULT_AGENT_SETTINGS.aggressiveness,
    inspection_frequency:
      typeof input.inspectionFrequency === 'string' && input.inspectionFrequency
        ? input.inspectionFrequency
        : DEFAULT_AGENT_SETTINGS.inspectionFrequency,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('agent_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;

  return {
    enabled: Boolean(data?.autonomous_actions_enabled),
    aggressiveness:
      typeof data?.aggressiveness === 'number'
        ? data.aggressiveness
        : DEFAULT_AGENT_SETTINGS.aggressiveness,
    inspectionFrequency:
      typeof data?.inspection_frequency === 'string' && data.inspection_frequency
        ? data.inspection_frequency
        : DEFAULT_AGENT_SETTINGS.inspectionFrequency,
  };
}

async function getPrivacySettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { ...DEFAULT_PRIVACY_SETTINGS };
    }
    throw error;
  }

  return {
    dataRetention:
      typeof data?.data_retention === 'string' && data.data_retention
        ? data.data_retention
        : DEFAULT_PRIVACY_SETTINGS.dataRetention,
    anonymizeFeedback:
      typeof data?.anonymize_feedback === 'boolean'
        ? data.anonymize_feedback
        : DEFAULT_PRIVACY_SETTINGS.anonymizeFeedback,
  };
}

async function savePrivacySettings(userId, input) {
  const payload = {
    user_id: userId,
    data_retention:
      typeof input.dataRetention === 'string' && input.dataRetention
        ? input.dataRetention
        : DEFAULT_PRIVACY_SETTINGS.dataRetention,
    anonymize_feedback:
      typeof input.anonymizeFeedback === 'boolean'
        ? input.anonymizeFeedback
        : DEFAULT_PRIVACY_SETTINGS.anonymizeFeedback,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;

  return {
    dataRetention:
      typeof data?.data_retention === 'string' && data.data_retention
        ? data.data_retention
        : DEFAULT_PRIVACY_SETTINGS.dataRetention,
    anonymizeFeedback:
      typeof data?.anonymize_feedback === 'boolean'
        ? data.anonymize_feedback
        : DEFAULT_PRIVACY_SETTINGS.anonymizeFeedback,
  };
}

async function deleteAllFrom(table, userId) {
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

async function resetProjectData(userId) {
  const userScopedDeletes = [
    'agent_activity',
    'inspection_results',
    'mobile_inspection_results',
    'mobile_inspections',
    'agent_actions',
    'notifications',
    'learning_stats',
    'issue_metrics',
    'agent_memory',
    'tickets',
    'reminders',
    'feedback_events',
    'issues',
    'job_queue',
    'scheduled_jobs',
    'system_events',
    'user_context',
    'agent_outcomes',
    'repo_stats',
  ];

  for (const table of userScopedDeletes) {
    await deleteAllFrom(table, userId);
  }
}

async function deleteProject(userId) {
  await resetProjectData(userId);

  const additionalDeletes = [
    'connected_accounts',
    'product_setup',
    'github_settings',
    'repo_mappings',
    'repo_structure',
    'mobile_apps',
    'user_settings',
  ];

  for (const table of additionalDeletes) {
    await deleteAllFrom(table, userId);
  }

  const workspaceTables = ['approval_requests', 'workspace_activity', 'issue_comments', 'issue_assignments'];
  for (const table of workspaceTables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in(
        'workspace_id',
        (
          await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_user_id', userId)
        ).data?.map((row) => row.id) || ['00000000-0000-0000-0000-000000000000']
      );

    if (error && !isMissingRelationError(error)) {
      throw error;
    }
  }

  const { error: workspaceDeleteError } = await supabase
    .from('workspaces')
    .delete()
    .eq('owner_user_id', userId);

  if (workspaceDeleteError && !isMissingRelationError(workspaceDeleteError)) {
    throw workspaceDeleteError;
  }
}

module.exports = {
  deleteProject,
  getAgentSettings,
  getPrivacySettings,
  getProductSettings,
  resetProjectData,
  saveAgentSettings,
  savePrivacySettings,
  saveProductSettings,
};
