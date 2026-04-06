const mongoose = require('mongoose');

const VaultSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  website: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  encryptedPassword: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vault', VaultSchema);
