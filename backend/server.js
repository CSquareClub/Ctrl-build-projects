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

      let skillMatch = u.skills.filter(skill =>
        !user.skills.includes(skill)
      ).length;

      let rolePenalty = u.role === user.role ? 5 : 0;

      let expDiff = Math.abs(user.experience - u.experience);
      let expScore = Math.max(0, 10 - expDiff);

      let hoursDiff = Math.abs(user.commitmentHours - u.commitmentHours);
      let hoursScore = Math.max(0, 10 - hoursDiff * 2);

      let score =
        (skillMatch * 10) +
        u.reliabilityScore +
        expScore +
        hoursScore -
        rolePenalty;

      let reasons = [];

      if (skillMatch > 0) reasons.push(`Has ${skillMatch} complementary skill(s)`);
      if (expScore > 5) reasons.push("Similar experience level");
      if (hoursScore > 5) reasons.push("Similar availability");
      if (u.reliabilityScore > 70) reasons.push("Highly reliable teammate");

      if (reasons.length === 0) reasons.push("Potential teammate");

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

/* -------------------- AUTO TEAM BUILDER -------------------- */
app.get("/build-team/:id", async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found"
      });
    }

    let allUsers = await User.find({ _id: { $ne: user._id } });

    let scoredUsers = allUsers.map(u => {

      let skillMatch = u.skills.filter(skill =>
        !user.skills.includes(skill)
      ).length;

      let rolePenalty = u.role === user.role ? 5 : 0;

      let expDiff = Math.abs(user.experience - u.experience);
      let expScore = Math.max(0, 10 - expDiff);

      let hoursDiff = Math.abs(user.commitmentHours - u.commitmentHours);
      let hoursScore = Math.max(0, 10 - hoursDiff * 2);

      let score =
        (skillMatch * 10) +
        u.reliabilityScore +
        expScore +
        hoursScore -
        rolePenalty;

      return { user: u, score };
    });

    scoredUsers.sort((a, b) => b.score - a.score);

    // ✅ First pass: unique roles only
    let team = [user];
    let usedRoles = new Set([user.role]);

    for (let candidate of scoredUsers) {
      if (team.length >= 4) break;

      if (!usedRoles.has(candidate.user.role)) {
        team.push(candidate.user);
        usedRoles.add(candidate.user.role);
      }
    }

    // ✅ Second pass: fill remaining spots if team < 4
    for (let candidate of scoredUsers) {
      if (team.length >= 4) break;

      let alreadyAdded = team.find(m => m._id.equals(candidate.user._id));
      if (!alreadyAdded) {
        team.push(candidate.user);
      }
    }

    let teamScore = team.slice(1).reduce((sum, member) => {
      let found = scoredUsers.find(u => u.user._id.equals(member._id));
      return sum + (found ? found.score : 0);
    }, 0);

    res.send({
      success: true,
      teamSize: team.length,
      teamScore: teamScore,
      team: team
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error building team"
    });
  }
});

/* -------------------- DATABASE -------------------- */
mongoose.connect("mongodb://127.0.0.1:27017/devmatch")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

app.listen(5000, () => console.log("Server running on port 5000"));