const { processSelfHealJob } = require('../../services/selfHealQueueService');

async function runSelfHeal(input) {
  const progress = {};
  return processSelfHealJob({
    id: `self-heal-sync-${Date.now()}`,
    name: 'self-heal:run',
    data: {
      userId: String(input?.userId || ''),
      code: String(input?.code || ''),
      testCode: String(input?.testCode || ''),
      language: String(input?.language || 'javascript'),
      issue: input?.issue || null,
      createdAt: new Date().toISOString(),
    },
    updateProgress: async (nextProgress) => {
      Object.assign(progress, nextProgress || {});
    },
  });
}

module.exports = {
  runSelfHeal,
};
