const { analyzeCodeRisk } = require('../../services/codeRiskAnalyzerService');
const { generateCodeAutoFix } = require('../../services/codeAutoFixService');

async function analyzeCode(input) {
  const code = String(input?.code || '');
  const language = String(input?.language || '');
  const filePath = String(input?.filePath || '');

  if (!code.trim()) {
    throw new Error('code is required.');
  }

  return analyzeCodeRisk({
    code,
    language,
    filePath,
  });
}

async function generateFix(input) {
  const code = String(input?.code || '');
  const language = String(input?.language || '');
  const filePath = String(input?.filePath || '');

  if (!code.trim()) {
    throw new Error('code is required.');
  }

  return generateCodeAutoFix({
    code,
    language,
    filePath,
    issue: input?.issue || null,
  });
}

module.exports = {
  analyzeCode,
  generateFix,
};
