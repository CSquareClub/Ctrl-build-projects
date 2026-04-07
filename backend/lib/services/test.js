const {
  generateCodeTests,
  runGeneratedTests,
} = require('../../services/codeTestService');

async function generateTests(input) {
  return generateCodeTests({
    code: String(input?.code || ''),
    issue: input?.issue || null,
    analysis: input?.analysis || null,
    language: String(input?.language || 'javascript'),
  });
}

async function runTests(input) {
  return runGeneratedTests({
    code: String(input?.code || ''),
    testCode: String(input?.testCode || ''),
    language: String(input?.language || 'javascript'),
  });
}

module.exports = {
  generateTests,
  runTests,
};
