const express = require("express");
const mongoose = require("mongoose");
const app = express();

// Middleware
app.use(express.json());

// Route
app.get("/", (req, res) => {
  res.send("DevMatch Backend Running 🚀");
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});

mongoose.connect("mongodb://127.0.0.1:27017/devmatch")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));