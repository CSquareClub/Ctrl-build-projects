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

    // ✅ Fix: normalized reliability score (0–100)
    let reliabilityScore = Math.min(100, Math.round(
      (Math.min(commitmentHours, 24) / 24 * 40) +
      (Math.min(experience, 10) / 10 * 30) +
      (confidence * 3)
    ));

    let newUser = new User({ name, email, skills, role, experience, commitmentHours, confidence, reliabilityScore });
    await newUser.save();
    res.status(201).send(newUser);

  } catch (err) {
    console.error(err); // ✅ Fix: log real error
    res.status(500).send("Error creating user");
  }
});

/* -------------------- MATCHING API -------------------- */
app.get("/match/:id", async (req, res) => {
  console.log("MATCH API HIT");
  try {
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    let allUsers = await User.find({ _id: { $ne: user._id } });

    let matches = allUsers.map(u => {

      // ✅ Fix 1: complementary skills (what they have that you don't)
      let skillMatch = u.skills.filter(skill =>
        !user.skills.includes(skill)
      ).length;

      // ✅ Fix 2: penalize same role
      let rolePenalty = u.role === user.role ? 5 : 0;

      let score = (skillMatch * 10) + u.reliabilityScore - rolePenalty;

      return { user: u, matchScore: score };
    });

    matches.sort((a, b) => b.matchScore - a.matchScore);
    res.send(matches);

  } catch (err) {
    console.error(err); // ✅ Fix: log real error
    res.status(500).send("Error in matching");
  }
});

/* -------------------- DATABASE -------------------- */
mongoose.connect("mongodb://127.0.0.1:27017/devmatch")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

app.listen(5000, () => console.log("Server running on port 5000"));