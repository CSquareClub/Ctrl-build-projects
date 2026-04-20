const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,

  skills: [String],
  role: String,

  experience: Number,
  commitmentHours: Number,

  // 🔥 NEW FIELDS
  hackathonsJoined: {
    type: Number,
    default: 0
  },
  hackathonsAttended: {
    type: Number,
    default: 0
  },

  commitmentScore: {
    type: Number,
    default: 0
  },

  reliabilityScore: Number
});

module.exports = mongoose.model("User", userSchema);