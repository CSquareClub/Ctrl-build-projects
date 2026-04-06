const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("DevMatch Backend Running 🚀");
});

// Create user API
app.post("/user", async (req, res) => {
  try {
    let { name, email, skills, role, experience, commitmentHours, confidence } = req.body;

    let reliabilityScore =
      (commitmentHours * 0.4) +
      (experience * 10 * 0.3) +
      (confidence * 10 * 0.3);

    let newUser = new User({
      name,
      email,
      skills,
      role,
      experience,
      commitmentHours,
      confidence,
      reliabilityScore
    });

    await newUser.save();

    res.status(201).send(newUser);

  } catch (err) {
    res.status(500).send("Error creating user");
  }
});

// DB connection
mongoose.connect("mongodb://127.0.0.1:27017/devmatch")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});