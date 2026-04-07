const supabase = require('../lib/supabaseClient');
const { mobileInspectQueue } = require('../queues/mobileInspectQueue');
const { publishSystemEvent } = require('./liveEventsService');

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function normalizeActivity(row) {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    issueId: row.issue_id,
    message: row.message,
    status: row.status,
    metadata: row.metadata || {},
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
  };
}

function normalizeMobileApp(row) {
  return {
    id: row.id,
    userId: row.user_id,
    appName: row.app_name,
    appUrl: row.app_url,
    packageName: row.package_name || null,
    createdAt: row.created_at,
  };
}

function normalizeMobileInspection(row) {
  return {
    id: row.id,
    userId: row.user_id,
    appId: row.app_id,
    issue: row.issue,
    status: row.status,
    resultJson: row.result_json || {},
    createdAt: row.created_at,
  };
}

async function publishMobileInspectionEvent(userId, type, payload, priority = 'normal') {
  await publishSystemEvent({
    userId,
    type,
    queueName: 'mobile-inspect',
    priority,
    payload,
  });
}

async function logMobileInspectionActivity(input) {
  const record = {
    user_id: input.userId,
    project_id: input.projectId || null,
    issue_id: input.issueId || null,
    message: input.message,
    status: input.status || 'info',
    metadata: {
      inspectionType: 'mobile',
      ...(input.metadata || {}),
    },
  };

  const { data, error } = await supabase
    .from('agent_activity')
    .insert(record)
    .select('*')
    .maybeSingle();

  const activity = error
    ? isMissingRelationError(error)
      ? {
          id: `temp-mobile-activity-${Date.now()}`,
          userId: input.userId,
          projectId: input.projectId || null,
          issueId: input.issueId || null,
          message: input.message,
          status: input.status || 'info',
          metadata: record.metadata,
          timestamp: new Date().toISOString(),
        }
      : null
    : normalizeActivity(data);

  if (!activity && error) {
    throw error;
  }

  await publishMobileInspectionEvent(
    input.userId,
    'mobile-inspection.activity',
    activity,
    input.status === 'error' ? 'high' : 'normal'
  );

  return activity;
}

async function createMobileApp(input) {
  const { data, error } = await supabase
    .from('mobile_apps')
    .insert({
      user_id: input.userId,
      app_name: input.appName,
      app_url: input.appUrl,
      package_name: input.packageName || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeMobileApp(data);
}

async function listMobileApps(userId) {
  const { data, error } = await supabase
    .from('mobile_apps')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeMobileApp);
}

async function getMobileAppById(userId, appId) {
  const { data, error } = await supabase
    .from('mobile_apps')
    .select('*')
    .eq('user_id', userId)
    .eq('id', appId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeMobileApp(data) : null;
}

async function createMobileInspection(input) {
  const { data, error } = await supabase
    .from('mobile_inspections')
    .insert({
      user_id: input.userId,
      app_id: input.appId,
      issue: input.issue,
      status: input.status || 'pending',
      result_json: input.resultJson || {},
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeMobileInspection(data);
}

async function updateMobileInspection(inspectionId, patch) {
  const { data, error } = await supabase
    .from('mobile_inspections')
    .update({
      status: patch.status,
      result_json: patch.resultJson,
    })
    .eq('id', inspectionId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeMobileInspection(data);
}

async function getLatestMobileInspectionStatus(userId, appId) {
  const appsPromise = appId ? getMobileAppById(userId, appId).then((app) => (app ? [app] : [])) : listMobileApps(userId);
  const inspectionsQuery = supabase
    .from('mobile_inspections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const [apps, inspectionResponse] = await Promise.all([appsPromise, inspectionsQuery]);

  if (inspectionResponse.error) {
    if (isMissingRelationError(inspectionResponse.error)) {
      return {
        apps,
        latestInspection: null,
        inspections: [],
      };
    }
    throw inspectionResponse.error;
  }

  const inspections = (inspectionResponse.data || []).filter((row) => !appId || row.app_id === appId).map(normalizeMobileInspection);
  return {
    apps,
    latestInspection: inspections[0] || null,
    inspections,
  };
}

async function listMobileInspectionActivity(userId, options = {}) {
  let query = supabase
    .from('agent_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('metadata->>inspectionType', 'mobile')
    .order('timestamp', { ascending: false })
    .limit(options.limit || 30);

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeActivity);
}

async function listAgentActivity(userId, options = {}) {
  const { data, error } = await supabase
    .from('agent_activity')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(options.limit || 40);

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeActivity);
}

async function enqueueMobileInspectionJob(input) {
  const jobName = 'inspect:mobile';
  const dedupeKey = input.dedupeKey || [
    jobName,
    input.userId,
    input.appId,
    input.issue,
    input.deviceName || 'device',
  ].join(':');

  const payload = {
    userId: input.userId,
    projectId: input.projectId || null,
    issueId: input.issueId || null,
    inspectionId: input.inspectionId,
    appId: input.appId,
    appName: input.appName,
    issue: input.issue,
    steps: input.steps || [],
    appUrl: input.appUrl || null,
    deviceName: input.deviceName || null,
    platformName: input.platformName || null,
    platformVersion: input.platformVersion || null,
    packageName: input.packageName || null,
  };

  const job = await mobileInspectQueue.add(jobName, payload, {
    jobId: dedupeKey,
    priority: input.priority || 2,
  });

  await logMobileInspectionActivity({
    userId: input.userId,
    projectId: input.projectId || null,
    issueId: input.issueId || null,
    message: 'Queued mobile inspection job',
    status: 'info',
    metadata: {
      inspectionId: input.inspectionId,
      appId: input.appId,
      jobId: job.id,
      appName: input.appName,
      deviceName: input.deviceName || null,
      platformName: input.platformName || null,
    },
  });

  await publishMobileInspectionEvent(
    input.userId,
    'mobile-inspection.status',
    {
      inspectionId: input.inspectionId,
      appId: input.appId,
      state: 'queued',
      jobId: job.id,
      message: 'Mobile inspection queued',
    },
    'normal'
  );

  return {
    id: job.id,
    name: job.name,
    queueName: mobileInspectQueue.name,
  };
}

module.exports = {
  createMobileApp,
  createMobileInspection,
  enqueueMobileInspectionJob,
  getLatestMobileInspectionStatus,
  getMobileAppById,
  listAgentActivity,
  listMobileApps,
  listMobileInspectionActivity,
  logMobileInspectionActivity,
  normalizeMobileInspection,
  publishMobileInspectionEvent,
  updateMobileInspection,
};
