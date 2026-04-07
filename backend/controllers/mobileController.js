const { Buffer } = require('buffer');
const multer = require('multer');
const {
  createMobileApp,
  createMobileInspection,
  enqueueMobileInspectionJob,
  getLatestMobileInspectionStatus,
  getMobileAppById,
  listAgentActivity,
  listMobileInspectionActivity,
} = require('../services/mobileInspectionService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 300 * 1024 * 1024,
  },
});

function getBrowserStackAuthHeader() {
  const user = process.env.BROWSERSTACK_USER;
  const key = process.env.BROWSERSTACK_KEY;

  if (!user || !key) {
    throw new Error('BrowserStack credentials are not configured on the backend.');
  }

  return `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`;
}

function normalizeMobileSteps(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .slice(0, 12)
    .map((step) => {
      if (typeof step === 'string') {
        return step.trim();
      }

      if (!step || typeof step !== 'object') {
        return null;
      }

      return {
        action: String(step.action || '').trim(),
        label: String(step.label || step.value || step.selector || '').trim(),
        value: step.value == null ? '' : String(step.value),
        text: step.text == null ? '' : String(step.text),
        timeout: Number(step.timeout || 10000),
      };
    })
    .filter(Boolean);
}

async function uploadToBrowserStack({ file, uploadUrl, existingAppUrl, customId }) {
  if (existingAppUrl) {
    return existingAppUrl;
  }

  const authHeader = getBrowserStackAuthHeader();
  const form = new FormData();

  if (file) {
    form.append('file', new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' }), file.originalname || 'mobile-app.apk');
  } else if (uploadUrl) {
    form.append('url', uploadUrl);
  } else {
    throw new Error('Provide an APK/IPA file, upload URL, or existing BrowserStack app URL.');
  }

  if (customId) {
    form.append('custom_id', customId);
  }

  const response = await fetch('https://api-cloud.browserstack.com/app-automate/upload', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to upload app to BrowserStack.');
  }

  const appUrl = data?.app_url || data?.appUrl;
  if (!appUrl) {
    throw new Error('BrowserStack did not return an app URL.');
  }

  return appUrl;
}

async function connectMobileApp(req, res) {
  try {
    const appName = String(req.body?.app_name || req.body?.appName || '').trim();
    const packageName = String(req.body?.package_name || req.body?.packageName || '').trim();
    const uploadUrl = String(req.body?.upload_url || req.body?.uploadUrl || '').trim();
    const existingAppUrl = String(req.body?.app_url || req.body?.appUrl || '').trim();

    if (!appName) {
      return res.status(400).json({ error: 'app_name is required.' });
    }

    const appUrl = await uploadToBrowserStack({
      file: req.file || null,
      uploadUrl: uploadUrl || null,
      existingAppUrl: existingAppUrl || null,
      customId: `${req.user.id}-${appName}`.slice(0, 100),
    });

    const app = await createMobileApp({
      userId: req.user.id,
      appName,
      appUrl,
      packageName: packageName || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Mobile app connected',
      app,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to connect mobile app.',
    });
  }
}

async function startMobileInspection(req, res) {
  try {
    const appId = String(req.body?.app_id || req.body?.appId || '').trim();
    const issue = String(req.body?.issue || 'Mobile inspection').trim();
    const projectId = req.body?.projectId ? String(req.body.projectId) : null;
    const issueId = req.body?.issueId ? String(req.body.issueId) : null;
    const steps = normalizeMobileSteps(req.body?.steps);

    if (!appId) {
      return res.status(400).json({ error: 'app_id is required.' });
    }

    const app = await getMobileAppById(req.user.id, appId);
    if (!app) {
      return res.status(404).json({ error: 'Mobile app not found.' });
    }

    const inspection = await createMobileInspection({
      userId: req.user.id,
      appId,
      issue,
      status: 'pending',
      resultJson: {
        state: 'pending',
        appId,
        appName: app.appName,
      },
    });

    const job = await enqueueMobileInspectionJob({
      userId: req.user.id,
      projectId,
      issueId,
      inspectionId: inspection.id,
      appId: app.id,
      appName: app.appName,
      appUrl: app.appUrl,
      packageName: app.packageName,
      issue,
      steps,
    });

    return res.json({
      success: true,
      message: 'Inspection started',
      inspection,
      job,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start mobile inspection.',
    });
  }
}

async function getMobileStatus(req, res) {
  try {
    const appId = req.query?.app_id ? String(req.query.app_id) : req.query?.appId ? String(req.query.appId) : null;
    const status = await getLatestMobileInspectionStatus(req.user.id, appId);
    return res.json(status);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load mobile status.',
    });
  }
}

async function getMobileResults(req, res) {
  try {
    const appId = req.query?.app_id ? String(req.query.app_id) : req.query?.appId ? String(req.query.appId) : null;
    const status = await getLatestMobileInspectionStatus(req.user.id, appId);
    return res.json({
      results: (status.inspections || []).map((inspection) => ({
        id: inspection.id,
        userId: inspection.userId,
        projectId: null,
        issueId: null,
        issue: inspection.issue,
        deviceName: inspection.resultJson?.deviceName || null,
        platformName: inspection.resultJson?.platformName || null,
        platformVersion: inspection.resultJson?.platformVersion || null,
        appUrl: inspection.resultJson?.appUrl || null,
        observedBehavior: inspection.resultJson?.observedBehavior || "Inspection completed.",
        suspectedCause: inspection.resultJson?.suspectedCause || "No likely cause identified.",
        suggestedFix: inspection.resultJson?.suggestedFix || "Review the captured evidence.",
        confidence: Number(inspection.resultJson?.confidence || 0),
        rawData: inspection.resultJson || {},
        createdAt: inspection.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load mobile inspection results.',
    });
  }
}

async function getMobileActivity(req, res) {
  try {
    const activity = await listMobileInspectionActivity(req.user.id, {
      limit: Number(req.query?.limit || 30),
    });
    return res.json({ activity });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load mobile activity.',
    });
  }
}

async function getAgentActivity(req, res) {
  try {
    const activity = await listAgentActivity(req.user.id, {
      limit: Number(req.query?.limit || 40),
    });
    return res.json({ activity });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load agent activity.',
    });
  }
}

module.exports = {
  connectMobileApp,
  getAgentActivity,
  getMobileActivity,
  getMobileResults,
  getMobileStatus,
  startMobileInspection,
  mobileUploadMiddleware: upload.single('apk'),
};
