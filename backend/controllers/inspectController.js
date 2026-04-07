const { enqueueInspectionJob, listInspectionActivity, listInspectionResults } = require('../services/inspectionService');
const { ensureUserRecords } = require('../lib/ensureUserRecords');

function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeSteps(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((step) => step && typeof step === 'object')
    .slice(0, 10)
    .map((step) => ({
      action: String(step.action || '').trim(),
      selector: String(step.selector || '').trim(),
      value: step.value == null ? null : String(step.value),
      timeout: Number(step.timeout || 10000),
    }))
    .filter((step) => step.action);
}

async function startInspection(req, res) {
  try {
    await ensureUserRecords(req.user);

    const url = String(req.body?.url || '').trim();
    const issue = String(req.body?.issue || 'Issue inspection').trim();
    const projectId = req.body?.projectId ? String(req.body.projectId) : null;
    const issueId = req.body?.issueId ? String(req.body.issueId) : null;
    const page = String(req.body?.context?.page || 'Product page').trim();
    const steps = normalizeSteps(req.body?.context?.steps);
    const jobType = req.body?.jobType === 'inspect:health' ? 'inspect:health' : 'inspect:issue';

    if (!isValidHttpUrl(url)) {
      return res.status(400).json({
        error: 'A valid http/https inspection URL is required.',
      });
    }

    const job = await enqueueInspectionJob({
      jobType,
      userId: req.user.id,
      projectId,
      issueId,
      url,
      issue,
      context: {
        page,
        steps,
      },
      dedupeKey: req.body?.dedupeKey || null,
    });

    return res.json({
      success: true,
      message: 'Inspection started',
      job,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start inspection.',
    });
  }
}

async function getInspectionActivity(req, res) {
  try {
    const activity = await listInspectionActivity(req.user.id, {
      issueId: req.query?.issueId ? String(req.query.issueId) : null,
      limit: Number(req.query?.limit || 40),
    });

    return res.json({
      activity,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load inspection activity.',
    });
  }
}

async function getInspectionResults(req, res) {
  try {
    const results = await listInspectionResults(req.user.id, {
      issueId: req.query?.issueId ? String(req.query.issueId) : null,
      limit: Number(req.query?.limit || 10),
    });

    return res.json({
      results,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load inspection results.',
    });
  }
}

module.exports = {
  getInspectionActivity,
  getInspectionResults,
  startInspection,
};
