const express = require('express');
const router = express.Router();
const Vault = require('../models/Vault');

router.post('/store', async (req, res) => {
  try {
    const { userId, website, username, encryptedPassword } = req.body;
    Vault.save({ userId, website, username, encryptedPassword }, (err, doc) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, message: 'Password stored successfully' });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/retrieve/:userId', async (req, res) => {
  try {
    Vault.find({ userId: req.params.userId }, (err, docs) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, data: docs });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
