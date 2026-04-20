const express = require('express');
const router = express.Router();
const githubService = require('../services/githubService');
const aiService = require('../services/aiService');
const IssueAnalysis = require('../models/IssueAnalysis');

// GET /api/issue/:owner/:repo/:issueNumber
router.get('/issue/:owner/:repo/:issueNumber', async (req, res) => {
  const { owner, repo, issueNumber } = req.params;
  const issueId = `${owner}/${repo}#${issueNumber}`;

  try {
    // 1. Check if we already have it cached
    let issueDoc = await IssueAnalysis.findOne({ issueId });

    // 2. Fetch fresh from Github
    const liveData = await githubService.fetchIssue(owner, repo, issueNumber);

    if (!issueDoc) {
      issueDoc = new IssueAnalysis({
        issueId,
        repo: `${owner}/${repo}`,
        number: issueNumber,
        githubData: liveData
      });
      await issueDoc.save();
    } else {
      issueDoc.githubData = liveData;
      issueDoc.updatedAt = Date.now();
      await issueDoc.save();
    }

    res.json(issueDoc);
  } catch (error) {
    console.error('Route error fetching issue:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analyze
router.post('/analyze', async (req, res) => {
  const { issueId } = req.body;

  try {
    const issueDoc = await IssueAnalysis.findOne({ issueId });
    if (!issueDoc) {
      return res.status(404).json({ error: 'Issue not found in database. Fetch it first.' });
    }

    // Call OpenAI
    const analysisResult = await aiService.analyzeIssue(issueDoc.githubData);

    // Update Cache
    issueDoc.aiAnalysis = analysisResult;
    issueDoc.status = 'analyzed';
    issueDoc.updatedAt = Date.now();
    await issueDoc.save();

    // Broadcast via socket could be handled in server.js but we just return and let frontend emit 'request_analysis_complete' if needed.
    // We export the io handler logic to server.js instead
    
    // Using req.app.get('io') to emit via socket if needed
    const io = req.app.get('io');
    if (io) {
      io.emit('analysis_complete', { issueId, analysis: analysisResult });
    }

    res.json(issueDoc);
  } catch (error) {
    console.error('Route error analyzing issue:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Scaffolded route for generate-pr
router.post('/generate-pr', async (req, res) => {
  const { issueId } = req.body;
  try {
    const issueDoc = await IssueAnalysis.findOne({ issueId });
    if (!issueDoc) return res.status(404).json({ error: 'Not found' });
    
    // Normally you would use Github APIs to create a branch, commit code_patch, and open a PR.
    issueDoc.status = 'pr_generated';
    await issueDoc.save();
    
    res.json({ success: true, message: 'PR Draft created successfully (simulated from backend).', url: `https://github.com/${issueDoc.repo}/compare` });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Scaffolded route for routing to team
router.post('/route', async (req, res) => {
  const { issueId, team } = req.body;
  res.json({ success: true, message: `Issue assigned to ${team || 'Triage'} team successfully.` });
});

module.exports = router;
