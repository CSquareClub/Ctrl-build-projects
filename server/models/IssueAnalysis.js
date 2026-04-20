const mongoose = require('mongoose');

const issueAnalysisSchema = new mongoose.Schema({
  issueId: { type: String, required: true, unique: true }, // "owner/repo#number"
  repo: String,
  number: Number,
  githubData: {
    title: String,
    body: String,
    state: String,
    comments: Number,
    labels: [String],
    createdAt: Date,
    author: String
  },
  aiAnalysis: {
    severity: String,
    category: String,
    confidence: Number,
    analysis: String,
    root_cause: String,
    fix_suggestion: String,
    code_patch: String
  },
  status: { type: String, default: 'pending_analysis' }, // 'pending_analysis', 'analyzed', 'routed', 'pr_generated'
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IssueAnalysis', issueAnalysisSchema);
