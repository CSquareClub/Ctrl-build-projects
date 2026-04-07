const { groqJsonRequest } = require('../../lib/groqFeedbackClassifier');

let browserPromise = null;

function truncateText(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

async function loadPlaywrightChromium() {
  try {
    const playwright = require('playwright');
    return playwright.chromium;
  } catch {
    return null;
  }
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      const chromium = await loadPlaywrightChromium();
      if (!chromium) {
        throw new Error('Playwright runtime is not installed on the inspection service.');
      }

      return chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
    })().catch((error) => {
      browserPromise = null;
      throw error;
    });
  }

  return browserPromise;
}

async function closeSharedBrowser() {
  if (!browserPromise) {
    return;
  }

  try {
    const browser = await browserPromise;
    await browser.close().catch(() => null);
  } finally {
    browserPromise = null;
  }
}

function buildFallbackAnalysis(input) {
  const consoleErrors = input.consoleErrors || [];
  const networkFailures = input.networkFailures || [];
  const stepFailures = input.stepFailures || [];
  const issue = String(input.issue || 'Product issue');
  const strongestConsoleError = consoleErrors[0];
  const strongestNetworkFailure = networkFailures[0];
  const strongestStepFailure = stepFailures[0];

  return {
    issue_detected: Boolean(strongestConsoleError || strongestNetworkFailure || strongestStepFailure),
    selector: strongestStepFailure?.selector || null,
    screenshot: input.screenshotBase64 || null,
    confidence: strongestConsoleError || strongestNetworkFailure || strongestStepFailure ? 78 : 56,
    suggestions: strongestNetworkFailure
      ? ['Validate the failing endpoint and the auth state used by this page.']
      : strongestConsoleError
        ? ['Inspect the referenced UI code path and add a guard around the failing state.']
        : strongestStepFailure
          ? ['Stabilize the target selector and verify the page interaction path.']
          : ['Add more explicit inspection steps to improve the reproduction.'],
    observed_behavior: `Inspection completed for ${issue}. Captured ${consoleErrors.length} console issue(s), ${networkFailures.length} failed request(s), and ${stepFailures.length} failed interaction(s).`,
    suspected_cause: strongestConsoleError
      ? `Console error suggests a client-side failure: ${truncateText(strongestConsoleError.text, 160)}`
      : strongestNetworkFailure
        ? `Network failure detected for ${truncateText(strongestNetworkFailure.url, 120)}`
        : strongestStepFailure
          ? `Interaction failed around ${truncateText(strongestStepFailure.selector || strongestStepFailure.action || 'target element', 120)}`
          : 'No strong runtime failure was captured during the inspection.',
    suggested_fix: strongestNetworkFailure
      ? 'Validate the failing endpoint, response shape, and authentication path.'
      : strongestConsoleError
        ? 'Review the failing UI code path and add defensive state handling.'
        : strongestStepFailure
          ? 'Harden the page flow and stabilize the target interaction selector.'
          : 'Retry the inspection with additional guided steps.',
  };
}

async function analyzeInspection(input) {
  if (!process.env.GROQ_API_KEY) {
    return buildFallbackAnalysis(input);
  }

  try {
    const parsed = await groqJsonRequest([
      {
        role: 'system',
        content: [
          'You are an AI QA and debugging agent for AgenticPulse.',
          'Analyze inspection findings and return strict JSON only.',
          'Return JSON with keys: issue_detected, selector, confidence, suggestions, observed_behavior, suspected_cause, suggested_fix.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          issue: input.issue,
          url: input.url,
          page: input.page,
          consoleErrors: input.consoleErrors,
          networkFailures: input.networkFailures,
          stepFailures: input.stepFailures,
          domSnapshot: truncateText(input.domSnapshot, 8000),
        }),
      },
    ]);

    return {
      issue_detected: Boolean(parsed?.issue_detected ?? true),
      selector: parsed?.selector ? String(parsed.selector) : null,
      screenshot: input.screenshotBase64 || null,
      confidence: Number(parsed?.confidence || 68),
      suggestions: Array.isArray(parsed?.suggestions)
        ? parsed.suggestions.map((value) => String(value)).slice(0, 4)
        : [String(parsed?.suggested_fix || 'Review the captured inspection evidence.')],
      observed_behavior: String(parsed?.observed_behavior || 'Inspection completed.'),
      suspected_cause: String(parsed?.suspected_cause || 'No likely cause identified.'),
      suggested_fix: String(parsed?.suggested_fix || 'Review the captured inspection evidence and retry.'),
    };
  } catch {
    return buildFallbackAnalysis(input);
  }
}

async function runStep(page, step, stepFailures) {
  const action = String(step?.action || '').trim();
  const selector = String(step?.selector || '').trim();
  const value = step?.value;
  const timeout = Math.max(500, Math.min(Number(step?.timeout || 10000), 15000));

  if (!action) {
    return;
  }

  try {
    switch (action) {
      case 'click':
        await page.locator(selector).first().click({ timeout });
        return;
      case 'fill':
        await page.locator(selector).first().fill(String(value || ''), { timeout });
        return;
      case 'press':
        await page.locator(selector).first().press(String(value || 'Enter'), { timeout });
        return;
      case 'waitFor':
        await page.locator(selector).first().waitFor({ timeout });
        return;
      case 'goto':
        await page.goto(String(value || selector), { waitUntil: 'domcontentloaded', timeout });
        return;
      default:
        await page.waitForTimeout(300);
    }
  } catch (error) {
    stepFailures.push({
      action,
      selector,
      message: error instanceof Error ? error.message : 'Step failed',
    });
  }
}

async function inspectWithPlaywright(input) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const networkFailures = [];
  const stepFailures = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push({
        text: message.text(),
        location: message.location(),
      });
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push({
      text: error.message,
      location: null,
    });
  });

  page.on('requestfailed', (request) => {
    networkFailures.push({
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText || 'Request failed',
    });
  });

  const timeoutMs = Math.max(
    5000,
    Math.min(Number(input.timeoutMs || process.env.INSPECTION_SERVICE_TIMEOUT_MS || 15000), 20000)
  );
  const startedAt = Date.now();

  try {
    await page.goto(input.url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });

    const steps = Array.isArray(input.context?.steps) ? input.context.steps.slice(0, 10) : [];
    for (const step of steps) {
      await runStep(page, step, stepFailures);
    }

    const domSnapshot = await page.content().catch(() => '');
    const screenshotBase64 = await page
      .screenshot({ type: 'png', fullPage: true, timeout: timeoutMs })
      .then((buffer) => buffer.toString('base64'))
      .catch(() => null);

    const analysis = await analyzeInspection({
      issue: input.issue,
      url: input.url,
      page: input.context?.page || 'Target page',
      consoleErrors,
      networkFailures,
      stepFailures,
      domSnapshot,
      screenshotBase64,
    });

    return {
      ok: true,
      issue_detected: analysis.issue_detected,
      selector: analysis.selector,
      screenshot: analysis.screenshot,
      confidence: analysis.confidence,
      suggestions: analysis.suggestions,
      observed_behavior: analysis.observed_behavior,
      suspected_cause: analysis.suspected_cause,
      suggested_fix: analysis.suggested_fix,
      duration_ms: Date.now() - startedAt,
      console_errors: consoleErrors,
      network_failures: networkFailures,
      failed_actions: stepFailures,
      ui_context: input.context?.page || 'Target page',
    };
  } finally {
    await page.close().catch(() => null);
    await context.close().catch(() => null);
  }
}

module.exports = {
  closeSharedBrowser,
  inspectWithPlaywright,
};
