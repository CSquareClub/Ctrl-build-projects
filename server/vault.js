const express = require('express');
const router = express.Router();
const Vault = require('../models/Vault');

// POST /api/vault/store - Store encrypted password
router.post('/store', async (req, res) => {
  try {
    const { userId, website, username, encryptedPassword } = req.body;

    const entry = new Vault({
      userId,
      website,
      username,
      encryptedPassword
    });

    await entry.save();
    res.json({ success: true, message: 'Password stored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vault/retrieve/:userId - Retrieve all passwords for a user
router.get('/retrieve/:userId', async (req, res) => {
  try {
    const entries = await Vault.find({ userId: req.params.userId });
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
