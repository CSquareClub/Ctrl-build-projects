const express = require('express');
const router = express.Router();
const db = require('../models/Vault');

// POST /api/vault/store
router.post('/store', (req, res) => {
  const { userId, website, username, encryptedPassword, category, encryptedNotes } = req.body;
  
  if (!userId || !website || !username || !encryptedPassword) {
    return res.status(400).json({ success: false, error: 'Required fields missing' });
  }

  const entry = {
    userId,
    website,
    username,
    encryptedPassword,
    category: category || 'other',
    encryptedNotes: encryptedNotes || '',
    createdAt: new Date()
  };

  db.insert(entry, (err, newDoc) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Password stored', id: newDoc._id });
  });
});

// GET /api/vault/retrieve/:userId
router.get('/retrieve/:userId', (req, res) => {
  db.find({ userId: req.params.userId }).sort({ createdAt: -1 }).exec((err, docs) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: docs });
  });
});

// DELETE /api/vault/delete/:id
router.delete('/delete/:id', (req, res) => {
  db.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Deleted' });
  });
});

module.exports = router;

