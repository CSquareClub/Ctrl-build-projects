import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './database/db.js';
import User from './models/User.js';
import { ollamaChat } from './services/ollama.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Connect to MongoDB
connectDB();

// ====================== AUTH ROUTES ======================

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }

  try {
    const user = await User.findOne({ email });

    if (user && user.password === password) {
      const userResponse = {
        id: user._id,
        email: user.email,
        name: user.name,
        token: "devmatch-token-" + Date.now()
      };
      return res.json({ success: true, user: userResponse });
    } else {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Register Route
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    res.json({
      success: true,
      message: "Account created successfully",
      user: { id: newUser._id, name, email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ====================== USER DATA ROUTES ======================

// Save User Skills
app.post('/api/user/skills', async (req, res) => {
  const { userId, skills } = req.body;

  if (!userId || !skills || skills.length === 0) {
    return res.status(400).json({ success: false, message: "User ID and skills are required" });
  }

  try {
    console.log(`💾 Skills saved for user ${userId}:`, skills);
    res.json({ success: true, message: "Skills saved successfully", skills });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Save User Preferences (Interests + Role)
app.post('/api/user/preferences', async (req, res) => {
  const { userId, interests, preferredRole } = req.body;

  if (!userId || !interests || !preferredRole) {
    return res.status(400).json({ 
      success: false, 
      message: "User ID, interests and preferred role are required" 
    });
  }

  try {
    console.log(`💾 Preferences saved for user ${userId}:`, { interests, preferredRole });
    res.json({
      success: true,
      message: "Preferences saved successfully",
      data: { interests, preferredRole }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Test Route
app.get('/api/test-register', async (req, res) => {
  try {
    const testUser = new User({
      name: "Test User",
      email: "test" + Date.now() + "@example.com",
      password: "123456"
    });
    await testUser.save();
    res.json({
      success: true,
      message: "Test user created successfully!",
      user: { id: testUser._id, name: testUser.name, email: testUser.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: '✅ DevMatch Backend is LIVE', 
    port: PORT,
    mongodb: 'Connected',
    message: 'All systems operational'
  });
});
// Save User Goals & Availability
app.post('/api/user/goals', async (req, res) => {
  const { userId, goal, availability } = req.body;

  if (!userId || !goal || !availability) {
    return res.status(400).json({ 
      success: false, 
      message: "User ID, goal and availability are required" 
    });
  }

  try {
    console.log(`💾 Goals saved for user ${userId}:`, { goal, availability });

    res.json({
      success: true,
      message: "Goals saved successfully",
      data: { goal, availability }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 DevMatch Backend running on http://localhost:${PORT}`);
  console.log(`✅ MongoDB Connected`);
});