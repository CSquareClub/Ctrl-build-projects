const express = require("express");
const router = express.Router();
const Hackathon = require("../models/Hackathon");

/* -------------------- CREATE HACKATHON -------------------- */
router.post("/hackathon", async (req, res) => {
  try {
    let { title, description, createdBy, startDate, endDate, maxTeamSize, requiredSkills } = req.body;

    let newHackathon = new Hackathon({
      title,
      description,
      createdBy,
      startDate,
      endDate,
      maxTeamSize,
      requiredSkills
    });

    await newHackathon.save();

    res.status(201).send({
      success: true,
      message: "Hackathon created successfully",
      data: newHackathon
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error creating hackathon"
    });
  }
});

/* -------------------- GET ALL HACKATHONS -------------------- */
router.get("/hackathons", async (req, res) => {
  try {
    let hackathons = await Hackathon.find().sort({ createdAt: -1 });

    res.send({
      success: true,
      count: hackathons.length,
      data: hackathons
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error fetching hackathons"
    });
  }
});

/* -------------------- GET ONE HACKATHON -------------------- */
router.get("/hackathon/:id", async (req, res) => {
  try {
    let hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
      return res.status(404).send({
        success: false,
        message: "Hackathon not found"
      });
    }

    res.send({
      success: true,
      data: hackathon
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error fetching hackathon"
    });
  }
});

/* -------------------- UPDATE STATUS -------------------- */
router.patch("/hackathon/:id/status", async (req, res) => {
  try {
    let { status } = req.body;

    let hackathon = await Hackathon.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!hackathon) {
      return res.status(404).send({
        success: false,
        message: "Hackathon not found"
      });
    }

    res.send({
      success: true,
      message: `Hackathon marked as ${status}`,
      data: hackathon
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error updating status"
    });
  }
});

module.exports = router;