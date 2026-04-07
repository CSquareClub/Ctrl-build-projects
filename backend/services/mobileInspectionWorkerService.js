const { Worker } = require('bullmq');
const { remote } = require('webdriverio');
const { getRedisConnection } = require('../lib/redis');
const { groqJsonRequest } = require('../lib/groqFeedbackClassifier');
const {
  logMobileInspectionActivity,
  updateMobileInspection,
  publishMobileInspectionEvent,
} = require('./mobileInspectionService');

let workerInstance = null;

function truncateText(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function getBrowserStackConfig(payload) {
  const user = process.env.BROWSERSTACK_USER;
  const key = process.env.BROWSERSTACK_KEY;
  const appUrl = payload.appUrl || process.env.BROWSERSTACK_APP_URL;

  if (!user || !key || !appUrl) {
    throw new Error('Missing BrowserStack mobile inspection configuration.');
  }

  return {
    user,
    key,
    appUrl,
    deviceName: payload.deviceName || process.env.BROWSERSTACK_DEVICE_NAME || 'Google Pixel 6',
    platformName: payload.platformName || process.env.BROWSERSTACK_PLATFORM_NAME || 'Android',
    platformVersion: payload.platformVersion || process.env.BROWSERSTACK_PLATFORM_VERSION || '12.0',
  };
}

function buildCapabilities(payload) {
  const config = getBrowserStackConfig(payload);

  return {
    platformName: config.platformName,
    'appium:deviceName': config.deviceName,
    'appium:platformVersion': config.platformVersion,
    'appium:app': config.appUrl,
    'appium:automationName': config.platformName.toLowerCase() === 'ios' ? 'XCUITest' : 'UiAutomator2',
    'bstack:options': {
      userName: config.user,
      accessKey: config.key,
      projectName: 'AgenticPulse',
      buildName: 'Mobile Inspection',
      sessionName: payload.issue || 'Mobile inspection',
      debug: true,
      networkLogs: true,
      appiumLogs: true,
      deviceLogs: true,
    },
  };
}

function normalizeMobileSteps(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((step) => {
      if (typeof step === 'string') {
        const lowered = step.toLowerCase();
        return {
          action: lowered.includes('type') || lowered.includes('enter') ? 'type' : lowered.includes('wait') ? 'wait' : lowered.includes('open') ? 'open' : 'tap',
          label: step,
          value: step,
          text: '',
          timeout: 10000,
        };
      }

      if (!step || typeof step !== 'object') {
        return null;
      }

      return {
        action: String(step.action || 'tap').trim().toLowerCase(),
        label: String(step.label || step.value || step.selector || step.action || 'step').trim(),
        value: step.value == null ? '' : String(step.value),
        text: step.text == null ? '' : String(step.text),
        timeout: Number(step.timeout || 10000),
      };
    })
    .filter(Boolean);
}

async function tryElement(driver, selectors = []) {
  for (const selector of selectors) {
    if (!selector?.using || !selector?.value) continue;

    try {
      let element = null;
      switch (selector.using) {
        case 'accessibility id':
          element = await driver.$(`~${selector.value}`);
          break;
        case 'android':
          element = await driver.$(`android=${selector.value}`);
          break;
        case 'ios':
          element = await driver.$(`-ios predicate string:${selector.value}`);
          break;
        default:
          element = await driver.$(selector.value);
      }

      if (element && (await element.isExisting())) {
        return { element, selector };
      }
    } catch {
      // Try next selector.
    }
  }

  return null;
}

function getStepSelectors(step) {
  const rawValue = String(step?.value || '').trim();
  const normalized = rawValue.toLowerCase();
  const candidates = [];

  if (rawValue) {
    candidates.push({ using: 'accessibility id', value: rawValue });
    candidates.push({ using: 'android', value: `new UiSelector().textContains("${rawValue}")` });
    candidates.push({ using: 'xpath', value: `//*[@text="${rawValue}" or contains(@text,"${rawValue}")]` });
    candidates.push({ using: 'xpath', value: `//*[@content-desc="${rawValue}" or contains(@content-desc,"${rawValue}")]` });
  }

  if (normalized.includes('login')) {
    candidates.push({ using: 'accessibility id', value: 'login' });
    candidates.push({ using: 'android', value: 'new UiSelector().textContains("Login")' });
  }

  if (normalized.includes('dashboard')) {
    candidates.push({ using: 'android', value: 'new UiSelector().textContains("Dashboard")' });
  }

  return candidates;
}

function buildFallbackAnalysis(input) {
  const stepFailures = input.stepFailures || [];
  const deviceLogs = input.deviceLogs || [];
  const issue = String(input.issue || 'Mobile issue');

  return {
    issue_explanation: `Mobile inspection completed for ${issue}. The cloud device reported ${stepFailures.length} failed interaction(s).`,
    suspected_cause: stepFailures[0]
      ? `Interaction failure detected around ${truncateText(stepFailures[0].label, 100)}.`
      : deviceLogs[0]
        ? `Device logs suggest a runtime issue: ${truncateText(deviceLogs[0], 150)}`
        : 'No clear crash signature was captured. The flow may need more precise mobile selectors.',
    suggested_fix: stepFailures[0]
      ? 'Add precise mobile selectors for this flow and verify the login screen structure on the target build.'
      : 'Inspect the mobile client logs, API timeout behavior, and the target build configuration.',
    confidence: stepFailures[0] || deviceLogs[0] ? 74 : 56,
  };
}

async function analyzeMobileInspection(input) {
  if (!process.env.GROQ_API_KEY) {
    return buildFallbackAnalysis(input);
  }

  try {
    const parsed = await groqJsonRequest([
      {
        role: 'system',
        content: [
          'You are an AI mobile QA and debugging agent for AgenticPulse.',
          'Analyze BrowserStack/Appium findings and return strict JSON only.',
          'Return JSON with keys: issue_explanation, suspected_cause, suggested_fix, confidence.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          issue: input.issue,
          appName: input.appName,
          deviceName: input.deviceName,
          platformName: input.platformName,
          platformVersion: input.platformVersion,
          stepFailures: input.stepFailures,
          deviceLogs: input.deviceLogs,
          pageSource: truncateText(input.pageSource, 7000),
          sessionUrl: input.sessionUrl,
        }),
      },
    ]);

    return {
      issue_explanation: String(parsed?.issue_explanation || 'Mobile inspection completed.'),
      suspected_cause: String(parsed?.suspected_cause || 'No likely cause identified.'),
      suggested_fix: String(parsed?.suggested_fix || 'Review the mobile interaction trace and retry with more specific selectors.'),
      confidence: Number(parsed?.confidence || 64),
    };
  } catch {
    return buildFallbackAnalysis(input);
  }
}

async function executeMobileStep(driver, step, context) {
  const { userId, projectId, issueId, inspectionId } = context;
  const timeout = Number(step.timeout || 10000);

  await logMobileInspectionActivity({
    userId,
    projectId,
    issueId,
    message: `Executing mobile step: ${step.label}`,
    status: 'info',
    metadata: {
      inspectionId,
      action: step.action,
      label: step.label,
    },
  });

  if (step.action === 'open') {
    await driver.pause(1500);
    return { success: true };
  }

  if (step.action === 'wait') {
    await driver.pause(Math.min(timeout, 5000));
    return { success: true };
  }

  const match = await tryElement(driver, getStepSelectors(step));
  if (!match) {
    throw new Error(`Mobile element not found for step: ${step.label}`);
  }

  if (step.action === 'type') {
    await match.element.setValue(step.text || step.value || '');
  } else {
    await match.element.click();
  }

  return {
    success: true,
    selector: match.selector,
  };
}

async function processMobileInspectionJob(job) {
  const payload = job.data || {};
  const userId = payload.userId;
  const projectId = payload.projectId || null;
  const issueId = payload.issueId || null;
  const inspectionId = payload.inspectionId;
  const issue = payload.issue || 'Mobile inspection';
  const jobId = job?.id || `mobile-${Date.now()}`;

  if (!userId || !inspectionId || !payload.appId) {
    throw new Error('Mobile inspection jobs require userId, appId, and inspectionId.');
  }

  const config = getBrowserStackConfig(payload);
  const steps = normalizeMobileSteps(payload.steps);

  await updateMobileInspection(inspectionId, {
    status: 'running',
    resultJson: {
      state: 'running',
      appId: payload.appId,
      appName: payload.appName,
      deviceName: config.deviceName,
      platformName: config.platformName,
      platformVersion: config.platformVersion,
    },
  });

  await publishMobileInspectionEvent(userId, 'mobile-inspection.status', {
    inspectionId,
    appId: payload.appId,
    state: 'running',
    jobId,
    message: 'Mobile inspection started',
  });

  await logMobileInspectionActivity({
    userId,
    projectId,
    issueId,
    message: 'Connecting to cloud device',
    status: 'info',
    metadata: {
      inspectionId,
      appId: payload.appId,
      deviceName: config.deviceName,
      platformName: config.platformName,
      platformVersion: config.platformVersion,
    },
  });

  let driver = null;
  let sessionId = null;
  let sessionUrl = null;
  let pageSource = '';
  let screenshotBase64 = null;
  let deviceLogs = [];
  const stepFailures = [];
  let sessionOutcome = 'passed';
  let sessionReason = 'AgenticPulse mobile inspection completed';

  try {
    driver = await remote({
      protocol: 'https',
      hostname: 'hub-cloud.browserstack.com',
      port: 443,
      path: '/wd/hub',
      capabilities: buildCapabilities(payload),
      logLevel: 'error',
      connectionRetryCount: 1,
      connectionRetryTimeout: 120000,
    });

    sessionId = driver.sessionId;
    sessionUrl = sessionId ? `https://app-automate.browserstack.com/dashboard/v2/sessions/${sessionId}` : null;

    await logMobileInspectionActivity({
      userId,
      projectId,
      issueId,
      message: 'Launching mobile app',
      status: 'success',
      metadata: {
        inspectionId,
        appId: payload.appId,
        sessionId,
        sessionUrl,
        appName: payload.appName,
      },
    });

    await driver.pause(2500);

    for (const step of steps) {
      try {
        await executeMobileStep(driver, step, { userId, projectId, issueId, inspectionId });
      } catch (error) {
        const failure = {
          label: step.label,
          action: step.action,
          message: error instanceof Error ? error.message : 'Unknown mobile step failure',
        };
        stepFailures.push(failure);

        await logMobileInspectionActivity({
          userId,
          projectId,
          issueId,
          message: `Failed interaction: ${step.label}`,
          status: 'error',
          metadata: {
            inspectionId,
            appId: payload.appId,
            ...failure,
          },
        });
      }
    }

    pageSource = await driver.getPageSource().catch(() => '');
    screenshotBase64 = await driver.takeScreenshot().catch(() => null);
    deviceLogs = await driver.getLogs('logcat').then((entries) => entries.map((entry) => entry.message)).catch(() => []);

    if (stepFailures.length > 0) {
      await logMobileInspectionActivity({
        userId,
        projectId,
        issueId,
        message: 'UI issue detected',
        status: 'error',
        metadata: {
          inspectionId,
          appId: payload.appId,
          count: stepFailures.length,
          first: stepFailures[0],
        },
      });
    }

    await logMobileInspectionActivity({
      userId,
      projectId,
      issueId,
      message: 'Analyzing behavior',
      status: 'info',
      metadata: {
        inspectionId,
        appId: payload.appId,
        sessionUrl,
      },
    });

    const analysis = await analyzeMobileInspection({
      issue,
      appName: payload.appName,
      deviceName: config.deviceName,
      platformName: config.platformName,
      platformVersion: config.platformVersion,
      stepFailures,
      deviceLogs,
      pageSource,
      sessionUrl,
    });

    const resultJson = {
      state: 'completed',
      appId: payload.appId,
      appName: payload.appName,
      appUrl: config.appUrl,
      deviceName: config.deviceName,
      platformName: config.platformName,
      platformVersion: config.platformVersion,
      observedBehavior: analysis.issue_explanation,
      suspectedCause: analysis.suspected_cause,
      suggestedFix: analysis.suggested_fix,
      confidence: analysis.confidence,
      steps,
      stepFailures,
      deviceLogs: deviceLogs.slice(0, 20),
      pageSource: truncateText(pageSource, 12000),
      screenshotBase64,
      sessionId,
      sessionUrl,
    };

    const inspection = await updateMobileInspection(inspectionId, {
      status: 'completed',
      resultJson,
    });

    await logMobileInspectionActivity({
      userId,
      projectId,
      issueId,
      message: 'Inspection completed',
      status: 'success',
      metadata: {
        inspectionId,
        appId: payload.appId,
        confidence: analysis.confidence,
        sessionUrl,
      },
    });

    await publishMobileInspectionEvent(userId, 'mobile-inspection.result', inspection, 'normal');
    await publishMobileInspectionEvent(userId, 'mobile-inspection.status', {
      inspectionId,
      appId: payload.appId,
      state: 'completed',
      jobId,
      message: 'Mobile inspection completed',
    });

    return inspection;
  } catch (error) {
    sessionOutcome = 'failed';
    sessionReason = error instanceof Error ? truncateText(error.message, 180) : 'Mobile inspection failed';

    const failedInspection = await updateMobileInspection(inspectionId, {
      status: 'failed',
      resultJson: {
        state: 'failed',
        appId: payload.appId,
        appName: payload.appName,
        appUrl: payload.appUrl || null,
        deviceName: config.deviceName,
        platformName: config.platformName,
        platformVersion: config.platformVersion,
        error: error instanceof Error ? error.message : 'Mobile inspection failed',
        sessionId,
        sessionUrl,
      },
    }).catch(() => null);

    await logMobileInspectionActivity({
      userId,
      projectId,
      issueId,
      message: error instanceof Error ? error.message : 'Mobile inspection failed',
      status: 'error',
      metadata: {
        inspectionId,
        appId: payload.appId,
        sessionUrl,
      },
    });

    if (failedInspection) {
      await publishMobileInspectionEvent(userId, 'mobile-inspection.result', failedInspection, 'high');
    }

    await publishMobileInspectionEvent(userId, 'mobile-inspection.status', {
      inspectionId,
      appId: payload.appId,
      state: 'failed',
      jobId,
      message: error instanceof Error ? error.message : 'Mobile inspection failed',
    }, 'high');

    throw error;
  } finally {
    if (driver) {
      if (sessionId) {
        try {
          await driver.execute(`browserstack_executor: ${JSON.stringify({
            action: 'setSessionStatus',
            arguments: {
              status: sessionOutcome,
              reason: sessionReason,
            },
          })}`);
        } catch {
          // Ignore BrowserStack status update failures.
        }
      }

      await driver.deleteSession().catch(() => null);
    }
  }
}

function startMobileInspectionWorker() {
  if (workerInstance || !process.env.REDIS_URL) {
    return workerInstance;
  }

  workerInstance = new Worker('mobile-inspect', processMobileInspectionJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  });

  workerInstance.on('completed', (job) => {
    console.log(`[mobile-inspect-worker] completed ${job.name} (${job.id})`);
  });

  workerInstance.on('failed', (job, error) => {
    console.error(`[mobile-inspect-worker] failed ${job?.name || 'unknown'} (${job?.id || 'n/a'}): ${error.message}`);
  });

  return workerInstance;
}

module.exports = {
  processMobileInspectionJob,
  startMobileInspectionWorker,
};
