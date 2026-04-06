const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("DevMatch Backend Running 🚀");
});

/* -------------------- CREATE USER -------------------- */
app.post("/user", async (req, res) => {
  try {
    let { name, email, skills, role, experience, commitmentHours, confidence } = req.body;

    // 🔥 Reliability Score (0–100)
    let reliabilityScore = Math.min(100, Math.round(
      (Math.min(commitmentHours, 24) / 24 * 40) +
      (Math.min(experience, 10) / 10 * 30) +
      (confidence * 3)
    ));

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

    res.status(201).send({
      success: true,
      message: "User created successfully",
      data: newUser
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error creating user"
    });
  }
});

/* -------------------- MATCHING API -------------------- */
app.get("/match/:id", async (req, res) => {
  console.log("MATCH API HIT");

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found"
      });
    }

    let allUsers = await User.find({ _id: { $ne: user._id } });

    let matches = allUsers.map(u => {

      // ✅ Complementary skills
      let skillMatch = u.skills.filter(skill =>
        !user.skills.includes(skill)
      ).length;

      // ✅ Penalize same role
      let rolePenalty = u.role === user.role ? 5 : 0;

      // 🔥 Experience similarity
      let expDiff = Math.abs(user.experience - u.experience);
      let expScore = Math.max(0, 10 - expDiff);

      // 🔥 Availability similarity
      let hoursDiff = Math.abs(user.commitmentHours - u.commitmentHours);
      let hoursScore = Math.max(0, 10 - hoursDiff * 2);

      // 🔥 FINAL SCORE
      let score =
        (skillMatch * 10) +
        u.reliabilityScore +
        expScore +
        hoursScore -
        rolePenalty;

      // 🔥 EXPLAINABILITY (KILLER FEATURE)
      let reasons = [];

      if (skillMatch > 0) {
        reasons.push(`Has ${skillMatch} complementary skill(s)`);
      }
      if (expScore > 5) {
        reasons.push("Similar experience level");
      }
      if (hoursScore > 5) {
        reasons.push("Similar availability");
      }
      if (u.reliabilityScore > 70) {
        reasons.push("Highly reliable teammate");
      }

      // ✅ Fallback if no reasons
      if (reasons.length === 0) {
        reasons.push("Potential teammate");
      }

      return {
        user: u,
        matchScore: score,
        reasons: reasons
      };
    });

    matches.sort((a, b) => b.matchScore - a.matchScore);

    res.send({
      success: true,
      count: matches.length,
      data: matches
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error in matching"
    });
  }
});

/* -------------------- DATABASE -------------------- */
mongoose.connect("mongodb://127.0.0.1:27017/devmatch")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

app.listen(5000, () => console.log("Server running on port 5000"));