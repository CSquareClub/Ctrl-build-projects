const {
  deleteProject,
  getAgentSettings,
  getPrivacySettings,
  getProductSettings,
  resetProjectData,
  saveAgentSettings,
  savePrivacySettings,
  saveProductSettings,
} = require('../services/settingsService');

function sanitizeOption(value, allowed, fallback) {
  const normalized = String(value || '').trim();
  return allowed.includes(normalized) ? normalized : fallback;
}

async function getProduct(req, res) {
  try {
    const settings = await getProductSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load product settings.',
    });
  }
}

async function updateProduct(req, res) {
  try {
    const websiteUrl = String(req.body?.websiteUrl || '').trim();
    if (websiteUrl) {
      try {
        const parsed = new URL(websiteUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid');
        }
      } catch {
        return res.status(400).json({ error: 'websiteUrl must be a valid http/https URL.' });
      }
    }

    const settings = await saveProductSettings(req.user.id, {
      productName: req.body?.productName,
      companyName: req.body?.companyName,
      description: req.body?.description,
      industry: req.body?.industry,
      teamSize: req.body?.teamSize,
      websiteUrl,
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update product settings.',
    });
  }
}

async function getAgent(req, res) {
  try {
    const settings = await getAgentSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load agent settings.',
    });
  }
}

async function updateAgent(req, res) {
  try {
    const frequency = sanitizeOption(
      req.body?.inspectionFrequency,
      ['realtime', 'hourly', 'daily', 'manual'],
      'realtime'
    );

    const settings = await saveAgentSettings(req.user.id, {
      enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : true,
      aggressiveness: req.body?.aggressiveness,
      inspectionFrequency: frequency,
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update agent settings.',
    });
  }
}

async function getPrivacy(req, res) {
  try {
    const settings = await getPrivacySettings(req.user.id);
    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load privacy settings.',
    });
  }
}

async function updatePrivacy(req, res) {
  try {
    const retention = sanitizeOption(
      req.body?.dataRetention,
      ['30', '90', '180', '365', 'forever'],
      '90'
    );

    const settings = await savePrivacySettings(req.user.id, {
      dataRetention: retention,
      anonymizeFeedback: Boolean(req.body?.anonymizeFeedback),
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update privacy settings.',
    });
  }
}

async function resetData(req, res) {
  try {
    await resetProjectData(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to reset project data.',
    });
  }
}

async function removeProject(req, res) {
  try {
    await deleteProject(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete project.',
    });
  }
}

module.exports = {
  getAgent,
  getPrivacy,
  getProduct,
  removeProject,
  resetData,
  updateAgent,
  updatePrivacy,
  updateProduct,
};
