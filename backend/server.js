const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json());

/* -------------------- TEST ROUTE -------------------- */
app.get("/", (req, res) => {
  res.send("DevMatch Backend Running 🚀");
});

/* -------------------- CREATE USER -------------------- */
app.post("/user", async (req, res) => {
  try {
    let {
      name,
      email,
      skills,
      role,
      experience,
      commitmentHours,
      hackathonsJoined,
      hackathonsAttended
    } = req.body;

    if (!name || !email || !skills || !role) {
      return res.status(400).send({ error: "name, email, skills, and role are required" });
    }

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).send({ error: "skills must be a non-empty array" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).send({ error: "A user with this email already exists" });
    }

    hackathonsJoined   = hackathonsJoined   || 0;
    hackathonsAttended = hackathonsAttended || 0;
    experience         = experience         || 0;
    commitmentHours    = commitmentHours    || 0;

    let commitmentScore = 0;
    if (hackathonsJoined > 0) {
      commitmentScore = Math.min(hackathonsAttended / hackathonsJoined, 1);
    }

    const normalizedHours = Math.min(commitmentHours / 40, 1) * 100;
    const normalizedExp   = Math.min(experience / 10, 1) * 100;
    const normalizedComm  = commitmentScore * 100;

    let reliabilityScore =
      (normalizedHours * 0.3) +
      (normalizedExp   * 0.3) +
      (normalizedComm  * 0.4);

    let newUser = new User({
      name,
      email,
      skills,
      role,
      experience,
      commitmentHours,
      hackathonsJoined,
      hackathonsAttended,
      commitmentScore,
      reliabilityScore
    });

    await newUser.save();
    res.status(201).send(newUser);

  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).send({ error: "Error creating user", details: err.message });
  }
});

/* -------------------- MATCHING API -------------------- */
app.get("/match/:id", async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send({ error: "Invalid user ID format" });
    }

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    if (!user.skills || user.skills.length === 0) {
      return res.status(400).send({ error: "User has no skills listed" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    let allUsers = await User.find({
      _id:  { $ne: user._id },
      role: { $ne: user.role }
    }).limit(limit);

    let matches = allUsers.map(u => {

      let commonSkills = u.skills.filter(skill =>
        user.skills.includes(skill)
      ).length;

      let totalSkills = new Set([...u.skills, ...user.skills]).size;

      let skillScore = totalSkills > 0
        ? (commonSkills / totalSkills) * 100
        : 0;

      let score =
        (skillScore * 0.6) +
        (u.reliabilityScore * 0.4);

      return {
        user: u,
        matchScore: parseFloat(score.toFixed(2))
      };
    });

    matches.sort((a, b) => b.matchScore - a.matchScore);

    res.send({
      total: matches.length,
      matches
    });

  } catch (err) {
    console.error("Error in matching:", err);
    res.status(500).send({ error: "Error in matching", details: err.message });
  }
});

/* -------------------- DATABASE + SERVER -------------------- */
mongoose.connect("mongodb://127.0.0.1:27017/devmatch", {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log("MongoDB Connected ✅");
    app.listen(5000, () => {
      console.log("Server running on port 5000 🚀");
    });
  })
  .catch(err => {
    console.error("MongoDB Connection Failed ❌", err);
    process.exit(1);
  });