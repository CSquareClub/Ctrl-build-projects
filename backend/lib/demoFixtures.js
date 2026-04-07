const { extractLocation } = require('../services/locationService');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAuditFeedbackText(index) {
  const variants = [
    'Audit form is not submitting, button does nothing after I fill every field.',
    'Audit page submit button does nothing and the form never finishes.',
    'I click submit on the audit form and nothing happens.',
    'Audit request is not reaching the backend after submit.',
    'The audit page keeps spinning after submit and never confirms.',
  ];

  return variants[index % variants.length];
}

function createSupportingFeedbackText(index) {
  const variants = [
    {
      title: 'Login not working after latest update',
      body: 'Users are reporting login friction after the latest update and authentication feels broken.',
      sentiment: 'negative',
    },
    {
      title: 'Payment failed during checkout',
      body: 'A payment attempt failed during checkout and billing now feels unreliable.',
      sentiment: 'negative',
    },
    {
      title: 'App crashes after clicking submit',
      body: 'The app crashes right after clicking submit and users are dropping out of the flow.',
      sentiment: 'negative',
    },
    {
      title: 'UI freezing on settings screen',
      body: 'The UI feels frozen after opening settings and performance is slow.',
      sentiment: 'negative',
    },
    {
      title: 'App is slow on the audit page',
      body: 'The audit page feels slow and laggy while trying to submit the form.',
      sentiment: 'negative',
    },
  ];

  return variants[index % variants.length];
}

function buildDemoGmailFeedbackRows({ userId, accountEmail }) {
  const rows = [];
  const now = Date.now();
  const syncSeed = `demo-${Date.now()}`;

  for (let index = 0; index < 25; index += 1) {
    const title = index % 2 === 0
      ? 'Audit form is not submitting'
      : 'Audit page submit button does nothing';
    const body = createAuditFeedbackText(index);
    const senderEmail = `audit-demo-${index + 1}@example.com`;
    const occurredAt = new Date(now - index * 1000 * 60 * 14).toISOString();

    rows.push({
      user_id: userId,
      source: 'gmail',
      external_id: `${syncSeed}-audit-${index + 1}`,
      title,
      body,
      author: `Audit User ${index + 1}`,
      author_email: senderEmail,
      occurred_at: occurredAt,
      sentiment: 'negative',
      replied: false,
      url: 'https://agenticpulse.vercel.app/audit',
      location: extractLocation({
        source: 'gmail',
        title,
        body,
        author: senderEmail,
        metadata: {
          accountEmail,
          country: 'India',
          state: 'Maharashtra',
        },
      }),
      metadata: {
        threadId: `${syncSeed}-audit-thread-${index + 1}`,
        senderEmail,
        senderName: `Audit User ${index + 1}`,
        originalSubject: title,
        messageIdHeader: `${syncSeed}-audit-message-${index + 1}`,
        classificationReason: 'hybrid-demo-gmail',
        groqSentiment: 'negative',
        isProductFeedback: true,
        fallbackIngest: true,
        demoMode: true,
        surface: 'audit-page',
      },
    });
  }

  for (let index = 0; index < 5; index += 1) {
    const feedback = createSupportingFeedbackText(index);
    const senderEmail = `signal-demo-${index + 1}@example.com`;
    const occurredAt = new Date(now - (index + 26) * 1000 * 60 * 18).toISOString();

    rows.push({
      user_id: userId,
      source: 'gmail',
      external_id: `${syncSeed}-support-${index + 1}`,
      title: feedback.title,
      body: feedback.body,
      author: `Signal User ${index + 1}`,
      author_email: senderEmail,
      occurred_at: occurredAt,
      sentiment: feedback.sentiment,
      replied: false,
      url: 'https://agenticpulse.vercel.app/dashboard',
      location: extractLocation({
        source: 'gmail',
        title: feedback.title,
        body: feedback.body,
        author: senderEmail,
        metadata: {
          accountEmail,
          country: 'India',
          state: index % 2 === 0 ? 'Karnataka' : 'Delhi',
        },
      }),
      metadata: {
        threadId: `${syncSeed}-support-thread-${index + 1}`,
        senderEmail,
        senderName: `Signal User ${index + 1}`,
        originalSubject: feedback.title,
        messageIdHeader: `${syncSeed}-support-message-${index + 1}`,
        classificationReason: 'hybrid-demo-gmail',
        groqSentiment: feedback.sentiment,
        isProductFeedback: true,
        fallbackIngest: true,
        demoMode: true,
      },
    });
  }

  return rows;
}

function getDemoInspectionFindings() {
  return [
    {
      issue: 'Form submit button has no event listener',
      severity: 'high',
      confidence: 0.92,
      context: 'Detected on the audit page submission path.',
    },
    {
      issue: 'Unhandled exception on submit',
      severity: 'critical',
      confidence: 0.96,
      context: 'Submit flow breaks before acknowledgment is shown.',
    },
  ];
}

module.exports = {
  buildDemoGmailFeedbackRows,
  getDemoInspectionFindings,
  wait,
};
