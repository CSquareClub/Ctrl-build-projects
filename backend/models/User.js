const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  skills: [String],
  role: String,
  experience: Number,
  commitmentHours: Number,
  confidence: Number,
  reliabilityScore: Number
});

module.exports = mongoose.model("User", userSchema);