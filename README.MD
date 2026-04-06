# 🚀 DevMatch – Implementation Plan
> AI-Powered Hackathon Team Builder | MERN Stack | Full Feature Roadmap

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Folder Structure](#folder-structure)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Feature Implementation Plan](#feature-implementation-plan)
   - Phase 1: Auth (OTP via Twilio)
   - Phase 2: Profile & GitHub
   - Phase 3: Matching Algorithm
   - Phase 4: AI Features
   - Phase 5: Real-Time (Socket.io)
   - Phase 6: UI Features
   - Phase 7: Hackathon Discovery (Devpost + Unstop)
   - Phase 8: Skill Verification Challenges
   - Phase 9: Team Health Dashboard
   - Phase 10: AI Idea Co-Pilot (Conversational)
   - Phase 11: Public Team Showcase & Leaderboard
   - Phase 12: Availability Heatmap
   - Phase 13: Anonymous / Blind Matching Mode
   - Phase 14: XP & Badge Gamification System
   - Phase 15: Team Invite Link (No-Auth Quick Join)
   - Phase 16: Voice Intro (30-Second Pitch)
8. [Environment Variables](#environment-variables)
9. [Timeline (24-Hour Hackathon)](#timeline)
10. [Edge Cases & Fallbacks](#edge-cases)
11. [Deployment](#deployment)

---

## 🧠 Project Overview

DevMatch transforms chaotic hackathon team formation into a smart, data-driven experience. Participants create profiles, get AI-matched with compatible teammates, see compatibility scores with explanations, and chat in real time — all backed by verified skills via GitHub. DevMatch also discovers **real hackathons** from Devpost and Unstop so users can find and join events within the same platform, turning DevMatch into a full **Hackathon Operating System**.

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | UI |
| Backend | Node.js + Express.js | REST API + Socket.io server |
| Database | MongoDB Atlas + Mongoose | Data persistence |
| Auth | Twilio Verify API | OTP-based phone login |
| AI | OpenAI GPT-4o | Match explanations, idea co-pilot, team builder |
| Real-Time | Socket.io | Live match updates + chat |
| Charts | Chart.js / Recharts | Skill radar chart, team health dashboard |
| GitHub | GitHub REST API v3 | Auto skill detection |
| Sessions | JWT (jsonwebtoken) | Stateless auth tokens |
| Hackathons | Devpost API + Unstop API | Real-time hackathon discovery |
| Media | Cloudinary / AWS S3 | Voice intro audio storage |
| Hosting | Render (backend) + Vercel (frontend) | Deployment |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                            │
│  Auth → Profile → Matching → Chat → Radar → Hackathons → Showcase│
└────────────────────────┬─────────────────────────────────────────┘
                         │ REST + Socket.io
┌────────────────────────▼─────────────────────────────────────────┐
│                     EXPRESS SERVER                               │
│  /api/auth  /api/users  /api/match  /api/github                 │
│  /api/hackathons  /api/quiz  /api/team  /api/showcase           │
│  Socket.io: joinRoom, sendMessage, newUserJoined, ideaCopilot   │
└──────┬──────────┬────────────┬──────────────┬────────────────────┘
       │          │            │              │
  MongoDB     OpenAI API   Twilio +       Devpost API +
  Atlas       (GPT-4o)     GitHub API     Unstop API
```

---

## 📁 Folder Structure

```
devmatch/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── PhoneInput.jsx
│   │   │   │   └── OTPVerify.jsx
│   │   │   ├── Profile/
│   │   │   │   ├── ProfileForm.jsx
│   │   │   │   ├── SkillRadarChart.jsx
│   │   │   │   └── VoiceIntro.jsx           # NEW
│   │   │   ├── Match/
│   │   │   │   ├── MatchCard.jsx
│   │   │   │   ├── CompatibilityScore.jsx
│   │   │   │   ├── MatchList.jsx
│   │   │   │   └── BlindMatchCard.jsx       # NEW
│   │   │   ├── Team/
│   │   │   │   ├── TeamHealthDashboard.jsx  # NEW
│   │   │   │   └── TeamInviteLink.jsx       # NEW
│   │   │   ├── Hackathons/
│   │   │   │   ├── HackathonCard.jsx        # NEW
│   │   │   │   └── HackathonFilter.jsx      # NEW
│   │   │   ├── Quiz/
│   │   │   │   └── SkillQuiz.jsx            # NEW
│   │   │   ├── Showcase/
│   │   │   │   ├── ShowcaseCard.jsx         # NEW
│   │   │   │   └── Leaderboard.jsx          # NEW
│   │   │   ├── Availability/
│   │   │   │   └── AvailabilityHeatmap.jsx  # NEW
│   │   │   ├── Chat/
│   │   │   │   ├── ChatWindow.jsx
│   │   │   │   ├── MessageBubble.jsx
│   │   │   │   └── IdeaCopilot.jsx          # NEW
│   │   │   └── UI/
│   │   │       ├── Navbar.jsx
│   │   │       └── Loader.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Matches.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Hackathons.jsx               # NEW
│   │   │   ├── Showcase.jsx                 # NEW
│   │   │   └── TeamBuilder.jsx              # NEW
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   └── useAuth.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│
├── server/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── matchController.js
│   │   ├── githubController.js
│   │   ├── chatController.js
│   │   ├── hackathonController.js           # NEW
│   │   ├── quizController.js               # NEW
│   │   ├── showcaseController.js           # NEW
│   │   └── voiceController.js              # NEW
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   ├── QuizResult.js                   # NEW
│   │   ├── Showcase.js                     # NEW
│   │   └── TeamInvite.js                   # NEW
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── matchRoutes.js
│   │   ├── githubRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── hackathonRoutes.js              # NEW
│   │   ├── quizRoutes.js                  # NEW
│   │   ├── showcaseRoutes.js              # NEW
│   │   └── voiceRoutes.js                 # NEW
│   ├── services/
│   │   ├── matchingService.js
│   │   ├── openaiService.js
│   │   ├── twilioService.js
│   │   ├── devpostService.js              # NEW
│   │   ├── unstopService.js              # NEW
│   │   └── quizService.js                # NEW
│   ├── socket/
│   │   └── socketHandler.js
│   ├── utils/
│   │   └── roleAssigner.js
│   ├── .env
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## 🗄️ Database Schema

### User Model (`server/models/User.js`)

```javascript
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, unique: true, required: true },
  email: { type: String, trim: true },

  skills: [
    {
      name: { type: String },
      level: { type: Number, min: 1, max: 5, default: 3 },
      verified: { type: Boolean, default: false },   // NEW — set true after quiz
      verifiedAt: { type: Date }
    }
  ],

  role: {
    type: String,
    enum: ['Frontend', 'Backend', 'Full Stack', 'ML Engineer', 'UI/UX Designer', 'Mobile Dev', 'DevOps'],
    required: true
  },

  experience: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
  availability: { type: String, enum: ['Full-time', 'Part-time', 'Flexible'], default: 'Full-time' },
  goals: { type: String, enum: ['Win', 'Learn', 'Network', 'Build'], default: 'Build' },
  projectInterest: { type: String, enum: ['Web App', 'AI Project', 'Blockchain', 'Mobile App', 'Open'], default: 'Open' },
  workingStyle: { type: String, enum: ['Fast-ship', 'Perfectionist', 'Async', 'In-person'], default: 'Fast-ship' },

  // Availability Heatmap — NEW
  availabilityGrid: {
    type: Map,
    of: [Number],   // e.g. { "Mon": [9,10,14,15], "Tue": [10,11] } — hours free
    default: {}
  },

  // Blind Matching — NEW
  blindMode: { type: Boolean, default: false },

  // Voice Intro — NEW
  voiceIntroUrl: { type: String },
  voiceIntroDuration: { type: Number },

  githubUsername: { type: String },
  githubData: {
    languages: [String],
    topRepos: [String],
    contributions: Number,
    profileUrl: String
  },

  assignedRole: { type: String },

  // XP & Gamification — NEW
  xp: { type: Number, default: 0 },
  level: { type: String, enum: ['Rookie', 'Hacker', 'Pro', 'Legend'], default: 'Rookie' },
  hackathonsAttended: { type: Number, default: 0 },
  badges: [{ type: String }],

  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
```

### Message Model (`server/models/Message.js`)

```javascript
const MessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  prefilledTemplate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
```

### QuizResult Model — NEW (`server/models/QuizResult.js`)

```javascript
const QuizResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, required: true },
  score: { type: Number },          // out of 100
  passed: { type: Boolean },
  timeTaken: { type: Number },      // seconds
  attemptedAt: { type: Date, default: Date.now }
});
```

### Showcase Model — NEW (`server/models/Showcase.js`)

```javascript
const ShowcaseSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hackathonName: { type: String },
  projectName: { type: String, required: true },
  description: { type: String },
  githubUrl: { type: String },
  demoUrl: { type: String },
  techStack: [String],
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});
```

### TeamInvite Model — NEW (`server/models/TeamInvite.js`)

```javascript
const TeamInviteSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, unique: true, required: true },
  hackathonId: { type: String },
  teamSlots: { type: Number, default: 4 },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
```

---

## 🔌 API Design

### Auth Routes (`/api/auth`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send OTP via Twilio |
| POST | `/api/auth/verify-otp` | Verify OTP, return JWT |
| GET | `/api/auth/join/:token` | Quick join via invite link (no auth required) |

### User Routes (`/api/users`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/users/profile` | Create/update user profile | ✅ |
| GET | `/api/users/me` | Get current user | ✅ |
| GET | `/api/users/:id` | Get user by ID | ✅ |
| POST | `/api/users/availability` | Save availability heatmap | ✅ |
| PATCH | `/api/users/blind-mode` | Toggle anonymous/blind mode | ✅ |

### Match Routes (`/api/match`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/match/:userId` | Get ranked matches | ✅ |
| GET | `/api/match/explain/:userId/:targetId` | AI explanation for a match | ✅ |
| GET | `/api/match/team/:userId` | AI-generated balanced team | ✅ |
| GET | `/api/match/team-health/:teamId` | Team health analysis | ✅ |

### GitHub Routes (`/api/github`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/github/:username` | Fetch GitHub profile + languages | ✅ |

### Chat Routes (`/api/chat`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/chat/:roomId` | Get chat history | ✅ |
| GET | `/api/chat/prefill/:targetId` | Context-aware starter messages | ✅ |
| POST | `/api/chat/copilot` | AI idea co-pilot message | ✅ |

### Hackathon Routes — NEW (`/api/hackathons`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/hackathons` | List hackathons (Devpost + Unstop merged) | ✅ |
| GET | `/api/hackathons/:id` | Single hackathon details | ✅ |
| GET | `/api/hackathons/filter` | Filter by domain, deadline, prize | ✅ |

### Quiz Routes — NEW (`/api/quiz`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/quiz/:skill` | Get 5 questions for a skill | ✅ |
| POST | `/api/quiz/:skill/submit` | Submit answers, get score + badge | ✅ |
| GET | `/api/quiz/results/:userId` | Get all quiz results for user | ✅ |

### Showcase Routes — NEW (`/api/showcase`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/showcase` | Publish a project | ✅ |
| GET | `/api/showcase` | Get all projects (sorted by upvotes) | ✅ |
| POST | `/api/showcase/:id/upvote` | Upvote a project | ✅ |
| GET | `/api/showcase/leaderboard` | Top teams leaderboard | ✅ |

### Voice Routes — NEW (`/api/voice`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/voice/upload` | Upload voice intro audio | ✅ |
| GET | `/api/voice/:userId` | Get voice intro URL | ✅ |
| DELETE | `/api/voice` | Delete voice intro | ✅ |

### Invite Routes — NEW (`/api/invite`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/invite/create` | Generate shareable invite link | ✅ |
| GET | `/api/invite/:token` | Get invite details | ❌ |
| POST | `/api/invite/:token/join` | Join team via invite | ❌ |

---

## ⚙️ Feature Implementation Plan

---

### Phase 1 — OTP Auth via Twilio

```bash
npm install twilio jsonwebtoken
```

**`server/services/twilioService.js`**
```javascript
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendOTP = async (phone) => {
  return await client.verify.v2
    .services(process.env.TWILIO_SERVICE_SID)
    .verifications.create({ to: phone, channel: 'sms' });
};

exports.verifyOTP = async (phone, code) => {
  const result = await client.verify.v2
    .services(process.env.TWILIO_SERVICE_SID)
    .verificationChecks.create({ to: phone, code });
  return result.status === 'approved';
};
```

**`server/controllers/authController.js`**
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTP, verifyOTP } = require('../services/twilioService');

exports.sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone required' });
  try {
    await sendOTP(phone);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  const { phone, code } = req.body;
  try {
    const approved = await verifyOTP(phone, code);
    if (!approved) return res.status(401).json({ message: 'Invalid OTP' });
    let user = await User.findOne({ phone });
    if (!user) user = await User.create({ phone, name: 'New User' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user, isNewUser: !user.name || user.name === 'New User' });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
};
```

---

### Phase 2 — Profile Creation + GitHub Integration

**`server/controllers/githubController.js`**
```javascript
const axios = require('axios');
const User = require('../models/User');

exports.fetchGitHub = async (req, res) => {
  const { username } = req.params;
  try {
    const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };
    const [profileRes, reposRes] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`, { headers }),
      axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, { headers })
    ]);
    const repos = reposRes.data;
    const languageMap = {};
    await Promise.all(repos.map(async (repo) => {
      const langRes = await axios.get(repo.languages_url, { headers });
      Object.keys(langRes.data).forEach(lang => {
        languageMap[lang] = (languageMap[lang] || 0) + langRes.data[lang];
      });
    }));
    const topLanguages = Object.keys(languageMap)
      .sort((a, b) => languageMap[b] - languageMap[a])
      .slice(0, 6);
    const githubData = {
      languages: topLanguages,
      topRepos: repos.slice(0, 3).map(r => r.name),
      contributions: profileRes.data.public_repos,
      profileUrl: profileRes.data.html_url
    };
    await User.findByIdAndUpdate(req.user.userId, { githubUsername: username, githubData });
    res.json({ githubData, detectedSkills: topLanguages });
  } catch (err) {
    res.status(500).json({ message: 'GitHub fetch failed', error: err.message });
  }
};
```

---

### Phase 3 — Matching Algorithm + Role Assignment

**`server/services/matchingService.js`**
```javascript
const ROLE_WEIGHT = 20;
const GOAL_WEIGHT = 15;
const AVAIL_WEIGHT = 10;
const SKILL_OVERLAP_PENALTY = -5;
const DOMAIN_BONUS = 25;
const VIBE_BONUS = 20;
const VERIFIED_SKILL_BONUS = 10;      // NEW — boost for verified skills
const AVAILABILITY_OVERLAP_BONUS = 15; // NEW — availability heatmap overlap

function calculateMatchScore(user, other) {
  let score = 0;
  const breakdown = {};

  // 1. Skill overlap
  const userSkillNames = user.skills.map(s => s.name);
  const otherSkillNames = other.skills.map(s => s.name);
  const overlap = userSkillNames.filter(s => otherSkillNames.includes(s));
  const overlapScore = overlap.length <= 2
    ? overlap.length * 8
    : overlap.length * SKILL_OVERLAP_PENALTY;
  score += overlapScore;
  breakdown.skillOverlap = overlapScore;

  // 2. Verified skills bonus — NEW
  const verifiedCount = other.skills.filter(s => s.verified).length;
  const verifiedBonus = Math.min(verifiedCount * VERIFIED_SKILL_BONUS, 20);
  score += verifiedBonus;
  breakdown.verifiedSkills = verifiedBonus;

  // 3. Complementary roles
  if (user.role !== other.role) { score += ROLE_WEIGHT; breakdown.roleComplement = ROLE_WEIGHT; }

  // 4. Goals alignment
  if (user.goals === other.goals) { score += GOAL_WEIGHT; breakdown.goalsMatch = GOAL_WEIGHT; }

  // 5. Availability match
  if (user.availability === other.availability) { score += AVAIL_WEIGHT; breakdown.availabilityMatch = AVAIL_WEIGHT; }

  // 6. Availability heatmap overlap — NEW
  if (user.availabilityGrid && other.availabilityGrid) {
    let overlapHours = 0;
    for (const [day, hours] of Object.entries(user.availabilityGrid)) {
      const otherHours = other.availabilityGrid[day] || [];
      overlapHours += hours.filter(h => otherHours.includes(h)).length;
    }
    const heatmapBonus = Math.min(overlapHours * 2, AVAILABILITY_OVERLAP_BONUS);
    score += heatmapBonus;
    breakdown.heatmapOverlap = heatmapBonus;
  }

  // 7. Domain match
  if (user.projectInterest === other.projectInterest || user.projectInterest === 'Open' || other.projectInterest === 'Open') {
    score += DOMAIN_BONUS; breakdown.domainMatch = DOMAIN_BONUS;
  }

  // 8. Working style (vibe match)
  if (user.workingStyle === other.workingStyle) { score += VIBE_BONUS; breakdown.vibeMatch = VIBE_BONUS; }

  const percentage = Math.min(Math.round((score / 120) * 100), 99);
  return { score, percentage, breakdown, sharedSkills: overlap };
}

function assignRole(user) {
  const skillNames = user.skills.map(s => s.name.toLowerCase());
  if (skillNames.some(s => ['tensorflow', 'pytorch', 'ml', 'python', 'sklearn'].includes(s))) return 'ML Engineer';
  if (skillNames.some(s => ['react', 'vue', 'angular', 'html', 'css', 'tailwind'].includes(s))) return 'Frontend Lead';
  if (skillNames.some(s => ['node', 'express', 'django', 'spring', 'postgresql', 'mongodb'].includes(s))) return 'Backend Lead';
  if (skillNames.some(s => ['figma', 'ui', 'ux', 'design', 'adobe'].includes(s))) return 'UI/UX Designer';
  if (skillNames.some(s => ['flutter', 'react native', 'swift', 'kotlin'].includes(s))) return 'Mobile Dev';
  return user.role || 'Full Stack';
}

module.exports = { calculateMatchScore, assignRole };
```

---

### Phase 4 — AI Features (OpenAI GPT-4o)

**`server/services/openaiService.js`**
```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.generateMatchExplanation = async (user, target, score, breakdown) => {
  const prompt = `
You are DevMatch AI. Given two hackathon participants, write a 2-sentence match explanation.
Be specific about their skills and roles. Sound smart but conversational.

User A: ${user.name}, Role: ${user.role}, Skills: ${user.skills.map(s => s.name).join(', ')}, Goal: ${user.goals}
User B: ${target.name}, Role: ${target.role}, Skills: ${target.skills.map(s => s.name).join(', ')}, Goal: ${target.goals}
Compatibility: ${score}%
Breakdown: ${JSON.stringify(breakdown)}

Return only the explanation text, no preamble.
  `;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 120
  });
  return res.choices[0].message.content.trim();
};

exports.generateProjectIdeas = async (team) => {
  const teamSummary = team.map(m =>
    `${m.user.name} (${m.role}): ${m.user.skills.map(s => s.name).join(', ')}`
  ).join('\n');
  const prompt = `
You are a hackathon idea generator. Given a team's skills and roles, suggest 3 project ideas.
Each idea: name, one-line description, and highlight which team member leads each part.
Return as JSON: [{ name, description, roleMapping }]
Team:\n${teamSummary}
  `;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 500
  });
  return JSON.parse(res.choices[0].message.content);
};

// NEW — Conversational Idea Co-Pilot
exports.ideaCopilot = async (messages, teamContext) => {
  const systemPrompt = `
You are DevMatch's AI Idea Co-Pilot for a hackathon team.
Team context: ${JSON.stringify(teamContext)}
Help them brainstorm, refine, and evolve project ideas conversationally.
When they say "make it more X" or "add Y angle", update the idea accordingly.
Keep responses concise (3-5 sentences max). Be enthusiastic but practical.
  `;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 300
  });
  return res.choices[0].message.content.trim();
};

// NEW — Team Health Analysis
exports.analyzeTeamHealth = async (team) => {
  const teamSummary = team.map(m =>
    `${m.name} (${m.role}): ${m.skills.map(s => s.name).join(', ')}`
  ).join('\n');
  const prompt = `
Analyze this hackathon team and return JSON:
{
  "overallScore": 0-100,
  "strengths": ["..."],
  "gaps": ["..."],
  "suggestedRoles": { "memberName": "role" },
  "recommendation": "one sentence"
}
Team:\n${teamSummary}
  `;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 400
  });
  return JSON.parse(res.choices[0].message.content);
};
```

---

### Phase 5 — Real-Time with Socket.io

**`server/socket/socketHandler.js`**
```javascript
const Message = require('../models/Message');

module.exports = (io) => {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    socket.on('user_online', (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.broadcast.emit('new_user_joined', { userId });
    });

    socket.on('join_room', ({ userId, targetId }) => {
      const roomId = [userId, targetId].sort().join('_');
      socket.join(roomId);
      socket.emit('room_joined', { roomId });
    });

    socket.on('send_message', async ({ roomId, senderId, text, prefilledTemplate }) => {
      const message = await Message.create({ roomId, sender: senderId, text, prefilledTemplate });
      io.to(roomId).emit('receive_message', message);
    });

    // NEW — Idea Co-Pilot room (team-wide)
    socket.on('join_copilot_room', ({ teamId }) => {
      socket.join(`copilot_${teamId}`);
    });

    socket.on('copilot_message', ({ teamId, message }) => {
      io.to(`copilot_${teamId}`).emit('copilot_update', { message });
    });

    socket.on('typing', ({ roomId, userId }) => {
      socket.to(roomId).emit('user_typing', { userId });
    });

    socket.on('disconnect', () => {
      for (const [userId, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user_offline', { userId });
          break;
        }
      }
    });
  });
};
```

---

### Phase 6 — UI Features

**`SkillRadarChart.jsx`**
```jsx
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function SkillRadarChart({ skills }) {
  const data = {
    labels: skills.map(s => s.verified ? `${s.name} ✅` : s.name),
    datasets: [{
      label: 'Skill Level',
      data: skills.map(s => s.level),
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2,
      pointBackgroundColor: skills.map(s => s.verified ? '#16a34a' : 'rgba(99,102,241,1)')
    }]
  };
  return <div className="w-64 h-64 mx-auto"><Radar data={data} /></div>;
}
```

**`CompatibilityScore.jsx`**
```jsx
export default function CompatibilityScore({ score, explanation, sharedSkills, assignedRole }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className={`text-4xl font-bold ${color}`}>{score}%</div>
      <div className="text-sm text-gray-500 mb-3">Compatibility Score</div>
      <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700 mb-3 italic">"{explanation}"</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {sharedSkills.map(s => (
          <span key={s} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">{s}</span>
        ))}
      </div>
      <div className="text-xs text-gray-400">Suggested role: <span className="font-semibold text-gray-600">{assignedRole}</span></div>
    </div>
  );
}
```

---

### Phase 7 — 🌐 Hackathon Discovery (Devpost + Unstop — Real Data)

> No mock data. We fetch real hackathons from Devpost's public API and Unstop's public API, merge them, deduplicate, and serve a unified feed.

**Install:**
```bash
npm install axios cheerio  # cheerio for Devpost HTML scraping fallback
```

**`server/services/devpostService.js`**
```javascript
const axios = require('axios');

// Devpost exposes a JSON feed via their search endpoint
const DEVPOST_BASE = 'https://devpost.com/api/hackathons';

exports.fetchDevpostHackathons = async ({ page = 1, status = 'open', search = '' } = {}) => {
  try {
    const { data } = await axios.get(DEVPOST_BASE, {
      params: {
        page,
        status,           // 'open' | 'upcoming' | 'ended'
        search,
        order_by: 'deadline'
      },
      headers: { 'Accept': 'application/json' }
    });

    return data.hackathons.map(h => ({
      id: `devpost_${h.id}`,
      source: 'Devpost',
      title: h.title,
      url: h.url,
      thumbnailUrl: h.thumbnail_url,
      deadline: h.submission_period_dates,
      prize: h.prize_amount,
      participants: h.registrations_count,
      themes: h.themes?.map(t => t.name) || [],
      eligibility: h.eligibility,
      location: h.displayed_location?.location || 'Online',
      status: h.open_state
    }));
  } catch (err) {
    console.error('Devpost fetch error:', err.message);
    return [];
  }
};
```

**`server/services/unstopService.js`**
```javascript
const axios = require('axios');

// Unstop public opportunity API
const UNSTOP_BASE = 'https://unstop.com/api/public/opportunity/search-result';

exports.fetchUnstopHackathons = async ({ page = 1, search = '' } = {}) => {
  try {
    const { data } = await axios.post(UNSTOP_BASE, {
      opportunity: 'hackathon',
      page,
      size: 20,
      search,
      filters: { status: ['open', 'upcoming'] }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const items = data?.data?.data || [];

    return items.map(h => ({
      id: `unstop_${h.id}`,
      source: 'Unstop',
      title: h.title,
      url: `https://unstop.com/${h.public_url}`,
      thumbnailUrl: h.logo_url,
      deadline: h.end_date,
      prize: h.prize_amount_text || 'Not specified',
      participants: h.registrations_count,
      themes: h.tags?.map(t => t.value) || [],
      eligibility: h.eligible_type,
      location: h.region_type || 'Online',
      status: h.status
    }));
  } catch (err) {
    console.error('Unstop fetch error:', err.message);
    return [];
  }
};
```

**`server/controllers/hackathonController.js`**
```javascript
const { fetchDevpostHackathons } = require('../services/devpostService');
const { fetchUnstopHackathons } = require('../services/unstopService');

// Simple in-memory cache (15 minutes) to avoid hammering the APIs
let cache = { data: null, fetchedAt: null };
const CACHE_TTL = 15 * 60 * 1000;

exports.getHackathons = async (req, res) => {
  try {
    const { page = 1, search = '', source = 'all', domain = '' } = req.query;

    // Serve from cache if fresh
    if (cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL) {
      return res.json(filterHackathons(cache.data, { search, source, domain }));
    }

    // Fetch from both APIs in parallel
    const [devpostHackathons, unstopHackathons] = await Promise.allSettled([
      fetchDevpostHackathons({ page, search }),
      fetchUnstopHackathons({ page, search })
    ]);

    const devpost = devpostHackathons.status === 'fulfilled' ? devpostHackathons.value : [];
    const unstop = unstopHackathons.status === 'fulfilled' ? unstopHackathons.value : [];

    // Merge + deduplicate by title similarity
    const merged = deduplicateByTitle([...devpost, ...unstop]);
    cache = { data: merged, fetchedAt: Date.now() };

    res.json(filterHackathons(merged, { search, source, domain }));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch hackathons', error: err.message });
  }
};

function deduplicateByTitle(hackathons) {
  const seen = new Set();
  return hackathons.filter(h => {
    const key = h.title.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterHackathons(hackathons, { search, source, domain }) {
  return hackathons.filter(h => {
    if (source !== 'all' && h.source.toLowerCase() !== source.toLowerCase()) return false;
    if (search && !h.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (domain && !h.themes.some(t => t.toLowerCase().includes(domain.toLowerCase()))) return false;
    return true;
  });
}
```

**`client/pages/Hackathons.jsx`**
```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import HackathonCard from '../components/Hackathons/HackathonCard';

export default function Hackathons() {
  const [hackathons, setHackathons] = useState([]);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHackathons();
  }, [search, source]);

  const fetchHackathons = async () => {
    setLoading(true);
    const { data } = await api.get('/hackathons', { params: { search, source } });
    setHackathons(data);
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🏆 Live Hackathons</h1>
      <div className="flex gap-3 mb-6">
        <input
          className="flex-1 border rounded-lg px-4 py-2"
          placeholder="Search hackathons..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="border rounded-lg px-3 py-2" value={source} onChange={e => setSource(e.target.value)}>
          <option value="all">All Sources</option>
          <option value="devpost">Devpost</option>
          <option value="unstop">Unstop</option>
        </select>
      </div>
      {loading ? (
        <p className="text-gray-500">Fetching real hackathons...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hackathons.map(h => <HackathonCard key={h.id} hackathon={h} />)}
        </div>
      )}
    </div>
  );
}
```

---

### Phase 8 — 🧪 Skill Verification via Mini Challenges

> GPT-4o generates 5 timed questions per skill. Passing verifies the skill on the profile with a ✅ badge.

**`server/services/quizService.js`**
```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.generateQuiz = async (skill) => {
  const prompt = `
Generate 5 multiple-choice questions to verify intermediate knowledge of "${skill}".
Return only JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}
Make questions practical, not theoretical. No preamble.
  `;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 800
  });
  return JSON.parse(res.choices[0].message.content);
};
```

**`server/controllers/quizController.js`**
```javascript
const { generateQuiz } = require('../services/quizService');
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');

exports.getQuiz = async (req, res) => {
  const { skill } = req.params;
  try {
    const quiz = await generateQuiz(skill);
    // Strip correct answers before sending to client
    const sanitized = quiz.questions.map(({ correctIndex, explanation, ...q }) => q);
    res.json({ skill, questions: sanitized });
  } catch (err) {
    res.status(500).json({ message: 'Quiz generation failed' });
  }
};

exports.submitQuiz = async (req, res) => {
  const { skill } = req.params;
  const { answers, timeTaken } = req.body;  // answers: [0, 2, 1, 3, 0]
  const userId = req.user.userId;

  try {
    const quiz = await generateQuiz(skill);
    const correct = quiz.questions.filter((q, i) => q.correctIndex === answers[i]).length;
    const score = Math.round((correct / 5) * 100);
    const passed = score >= 60;

    await QuizResult.create({ user: userId, skill, score, passed, timeTaken });

    if (passed) {
      await User.findByIdAndUpdate(userId, {
        $set: { 'skills.$[elem].verified': true, 'skills.$[elem].verifiedAt': new Date() },
        $inc: { xp: 50 }
      }, { arrayFilters: [{ 'elem.name': skill }] });
    }

    res.json({ score, passed, correct, total: 5, xpEarned: passed ? 50 : 0 });
  } catch (err) {
    res.status(500).json({ message: 'Quiz submission failed' });
  }
};
```

**`client/components/Quiz/SkillQuiz.jsx`**
```jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function SkillQuiz({ skill, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 min
  const [result, setResult] = useState(null);
  const startTime = Date.now();

  useEffect(() => {
    api.get(`/quiz/${skill}`).then(({ data }) => setQuestions(data.questions));
    const timer = setInterval(() => setTimeLeft(t => t <= 1 ? (clearInterval(timer), 0) : t - 1), 1000);
    return () => clearInterval(timer);
  }, [skill]);

  const submit = async () => {
    const answersArr = questions.map((_, i) => answers[i] ?? -1);
    const { data } = await api.post(`/quiz/${skill}/submit`, {
      answers: answersArr,
      timeTaken: Math.round((Date.now() - startTime) / 1000)
    });
    setResult(data);
    onComplete(data);
  };

  if (result) return (
    <div className="text-center p-6">
      <div className={`text-5xl font-bold mb-2 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
        {result.score}%
      </div>
      <p>{result.passed ? '✅ Skill Verified! +50 XP' : '❌ Try again after 24 hours'}</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-xl">{skill} Verification</h2>
        <span className="text-red-500 font-mono">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
      </div>
      {questions.map((q, i) => (
        <div key={q.id} className="mb-6 bg-white rounded-xl p-4 shadow-sm border">
          <p className="font-medium mb-3">{i+1}. {q.question}</p>
          {q.options.map((opt, j) => (
            <button key={j}
              onClick={() => setAnswers(prev => ({ ...prev, [i]: j }))}
              className={`w-full text-left px-4 py-2 rounded-lg mb-2 border transition-all
                ${answers[i] === j ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'}`}>
              {opt}
            </button>
          ))}
        </div>
      ))}
      <button onClick={submit} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">
        Submit ({Object.keys(answers).length}/{questions.length} answered)
      </button>
    </div>
  );
}
```

---

### Phase 9 — 📊 Team Health Dashboard

> Visual breakdown of team composition — radar overlay of all members, skill gap warnings, and role suggestions.

**`server/controllers/matchController.js` (team health endpoint)**
```javascript
exports.getTeamHealth = async (req, res) => {
  const { teamId } = req.params;
  const invite = await TeamInvite.findById(teamId).populate('members');
  if (!invite) return res.status(404).json({ message: 'Team not found' });

  const team = invite.members;
  const { analyzeTeamHealth } = require('../services/openaiService');
  const analysis = await analyzeTeamHealth(team);

  // Aggregate skill coverage across all members
  const allSkills = {};
  team.forEach(m => m.skills.forEach(s => {
    allSkills[s.name] = Math.max(allSkills[s.name] || 0, s.level);
  }));

  res.json({ analysis, members: team, skillCoverage: allSkills });
};
```

**`client/components/Team/TeamHealthDashboard.jsx`**
```jsx
import { Radar } from 'react-chartjs-2';

export default function TeamHealthDashboard({ members, analysis, skillCoverage }) {
  const colors = ['rgba(99,102,241,0.4)', 'rgba(16,185,129,0.4)', 'rgba(245,158,11,0.4)', 'rgba(239,68,68,0.4)'];

  const data = {
    labels: Object.keys(skillCoverage),
    datasets: members.map((m, i) => ({
      label: m.name,
      data: Object.keys(skillCoverage).map(skill =>
        m.skills.find(s => s.name === skill)?.level || 0
      ),
      backgroundColor: colors[i],
      borderColor: colors[i].replace('0.4', '1'),
      borderWidth: 2
    }))
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow border">
      <h2 className="text-xl font-bold mb-4">🏥 Team Health</h2>
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-3xl font-bold ${analysis.overallScore >= 70 ? 'text-green-600' : 'text-yellow-500'}`}>
          {analysis.overallScore}/100
        </div>
        <p className="text-gray-600 text-sm">{analysis.recommendation}</p>
      </div>
      <Radar data={data} />
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="font-semibold text-green-700 mb-1">✅ Strengths</p>
          {analysis.strengths.map(s => <p key={s} className="text-sm text-gray-600">• {s}</p>)}
        </div>
        <div>
          <p className="font-semibold text-red-600 mb-1">⚠️ Gaps</p>
          {analysis.gaps.map(g => <p key={g} className="text-sm text-gray-600">• {g}</p>)}
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 10 — 🤖 AI Idea Co-Pilot (Conversational, Team-Wide)

> A shared GPT-4o chat where the whole team talks to the AI to evolve project ideas in real time.

**`server/controllers/chatController.js` (co-pilot endpoint)**
```javascript
const { ideaCopilot } = require('../services/openaiService');
const User = require('../models/User');

exports.copilotMessage = async (req, res) => {
  const { messages, teamIds } = req.body;
  const team = await User.find({ _id: { $in: teamIds } });
  const teamContext = team.map(m => ({
    name: m.name, role: m.role,
    skills: m.skills.map(s => s.name),
    interest: m.projectInterest
  }));
  const reply = await ideaCopilot(messages, teamContext);
  res.json({ reply });
};
```

**`client/components/Chat/IdeaCopilot.jsx`**
```jsx
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';

export default function IdeaCopilot({ teamIds, teamId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 Hey team! I'm your AI co-pilot. What kind of project are you thinking?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    socket.emit('join_copilot_room', { teamId });
    socket.on('copilot_update', ({ message }) => {
      setMessages(prev => [...prev, message]);
    });
    return () => socket.off('copilot_update');
  }, [teamId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const { data } = await api.post('/chat/copilot', {
      messages: [...messages, userMsg],
      teamIds
    });
    const aiMsg = { role: 'assistant', content: data.reply };
    setMessages(prev => [...prev, aiMsg]);
    socket.emit('copilot_message', { teamId, message: aiMsg });
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-96 border rounded-2xl overflow-hidden">
      <div className="bg-indigo-600 text-white px-4 py-3 font-bold text-sm">🤖 AI Idea Co-Pilot</div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-2xl px-4 py-2 max-w-xs text-sm
              ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm animate-pulse">AI is thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t bg-white">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Make it more blockchain-focused..."
        />
        <button onClick={sendMessage} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Send
        </button>
      </div>
    </div>
  );
}
```

---

### Phase 11 — 🏆 Public Team Showcase & Leaderboard

**`server/controllers/showcaseController.js`**
```javascript
const Showcase = require('../models/Showcase');

exports.publishProject = async (req, res) => {
  const { teamName, members, hackathonName, projectName, description, githubUrl, demoUrl, techStack } = req.body;
  const project = await Showcase.create({ teamName, members, hackathonName, projectName, description, githubUrl, demoUrl, techStack });
  res.status(201).json(project);
};

exports.getShowcase = async (req, res) => {
  const projects = await Showcase.find().sort({ upvotes: -1 }).populate('members', 'name role');
  res.json(projects);
};

exports.upvoteProject = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const project = await Showcase.findById(id);
  if (project.upvotedBy.includes(userId)) {
    return res.status(400).json({ message: 'Already upvoted' });
  }
  project.upvotes += 1;
  project.upvotedBy.push(userId);
  await project.save();
  res.json({ upvotes: project.upvotes });
};

exports.getLeaderboard = async (req, res) => {
  const top = await Showcase.find().sort({ upvotes: -1 }).limit(10).populate('members', 'name role xp');
  res.json(top);
};
```

---

### Phase 12 — 📅 Availability Heatmap

**`client/components/Availability/AvailabilityHeatmap.jsx`**
```jsx
import { useState } from 'react';
import api from '../../services/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8am to 11pm

export default function AvailabilityHeatmap({ initial = {} }) {
  const [grid, setGrid] = useState(initial);
  const [saved, setSaved] = useState(false);

  const toggle = (day, hour) => {
    setGrid(prev => {
      const current = prev[day] || [];
      const updated = current.includes(hour)
        ? current.filter(h => h !== hour)
        : [...current, hour];
      return { ...prev, [day]: updated };
    });
    setSaved(false);
  };

  const save = async () => {
    await api.post('/users/availability', { availabilityGrid: grid });
    setSaved(true);
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1"></th>
            {HOURS.map(h => <th key={h} className="p-1 text-gray-500">{h}:00</th>)}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(day => (
            <tr key={day}>
              <td className="pr-2 font-semibold text-gray-600">{day}</td>
              {HOURS.map(hour => (
                <td key={hour}
                  onClick={() => toggle(day, hour)}
                  className={`w-6 h-6 rounded cursor-pointer border border-gray-100 transition-all
                    ${(grid[day] || []).includes(hour) ? 'bg-indigo-500' : 'bg-gray-100 hover:bg-indigo-200'}`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={save} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">
        {saved ? '✅ Saved!' : 'Save Availability'}
      </button>
    </div>
  );
}
```

---

### Phase 13 — 🕵️ Anonymous / Blind Matching Mode

> Users can enable blind mode — their name and photo are hidden during matching. Only skills, role, and score are shown. Identity reveals only after both parties accept.

**`client/components/Match/BlindMatchCard.jsx`**
```jsx
export default function BlindMatchCard({ match, onReveal, revealed }) {
  return (
    <div className="bg-white rounded-2xl border p-5 shadow-sm">
      {revealed ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
            {match.user.name[0]}
          </div>
          <div>
            <p className="font-semibold">{match.user.name}</p>
            <p className="text-sm text-gray-500">{match.user.role}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">?</div>
          <div>
            <p className="font-semibold text-gray-400">Anonymous Developer</p>
            <p className="text-sm text-gray-500">{match.user.role}</p>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {match.user.skills.map(s => (
          <span key={s.name} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs">
            {s.name} {s.verified && '✅'}
          </span>
        ))}
      </div>
      <div className="mt-3 text-2xl font-bold text-indigo-600">{match.compatibility}% match</div>
      {!revealed && (
        <button onClick={onReveal} className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold">
          Connect & Reveal Identity
        </button>
      )}
    </div>
  );
}
```

---

### Phase 14 — 🎮 XP & Badge Gamification System

**XP Events Table**

| Action | XP Earned |
|---|---|
| Complete profile | +20 XP |
| Connect GitHub | +15 XP |
| Pass skill quiz | +50 XP |
| Form a team | +30 XP |
| Attend a hackathon | +40 XP |
| Publish a showcase | +25 XP |
| Receive an upvote | +5 XP |

**`server/utils/xpManager.js`**
```javascript
const User = require('../models/User');

const XP_THRESHOLDS = { Rookie: 0, Hacker: 100, Pro: 300, Legend: 700 };

exports.awardXP = async (userId, amount, reason) => {
  const user = await User.findById(userId);
  user.xp += amount;

  // Level up check
  for (const [level, threshold] of Object.entries(XP_THRESHOLDS).reverse()) {
    if (user.xp >= threshold) { user.level = level; break; }
  }

  // Badge award
  const badges = [];
  if (amount === 50 && reason === 'quiz') badges.push('🧠 Verified Dev');
  if (reason === 'team_formed') badges.push('🤝 Team Player');
  if (reason === 'showcase') badges.push('🚀 Shipped It');

  user.badges = [...new Set([...user.badges, ...badges])];
  await user.save();
  return { xp: user.xp, level: user.level, newBadges: badges };
};
```

---

### Phase 15 — 🔗 Team Invite Link (No-Auth Quick Join)

**`server/controllers/authController.js` (invite join)**
```javascript
const crypto = require('crypto');
const TeamInvite = require('../models/TeamInvite');

exports.createInvite = async (req, res) => {
  const { hackathonId, teamSlots } = req.body;
  const token = crypto.randomBytes(8).toString('hex');
  const invite = await TeamInvite.create({
    createdBy: req.user.userId,
    token,
    hackathonId,
    teamSlots: teamSlots || 4,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h
  });
  res.json({ token, inviteUrl: `${process.env.CLIENT_URL}/join/${token}` });
};

exports.joinViaInvite = async (req, res) => {
  const { token } = req.params;
  const { phone } = req.body;
  const invite = await TeamInvite.findOne({ token });
  if (!invite || invite.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Invite expired or invalid' });
  }
  if (invite.members.length >= invite.teamSlots) {
    return res.status(400).json({ message: 'Team is full' });
  }
  // Create/find user by phone
  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ phone, name: 'New Member' });
  invite.members.addToSet(user._id);
  await invite.save();
  const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token: jwtToken, user, isNewUser: user.name === 'New Member', invite });
};
```

---

### Phase 16 — 🎤 Voice Intro (30-Second Pitch)

**Install:**
```bash
npm install multer @aws-sdk/client-s3  # or use Cloudinary
```

**`server/controllers/voiceController.js`**
```javascript
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const User = require('../models/User');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

exports.uploadVoice = [
  upload.single('audio'),
  async (req, res) => {
    const userId = req.user.userId;
    const key = `voice-intros/${userId}.webm`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: 'audio/webm'
    }));
    const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
    await User.findByIdAndUpdate(userId, { voiceIntroUrl: url });
    res.json({ url });
  }
];
```

**`client/components/Profile/VoiceIntro.jsx`**
```jsx
import { useState, useRef } from 'react';
import api from '../../services/api';

export default function VoiceIntro({ existingUrl }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingUrl);
  const [timeLeft, setTimeLeft] = useState(30);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
    mediaRef.current.onstop = uploadAudio;
    mediaRef.current.start();
    setRecording(true);
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { stopRecording(); return 0; } return t - 1; });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const uploadAudio = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', blob, 'intro.webm');
    const { data } = await api.post('/voice/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setAudioUrl(data.url);
  };

  return (
    <div className="bg-white rounded-2xl border p-4">
      <h3 className="font-bold mb-3">🎤 30-Second Voice Intro</h3>
      {audioUrl && <audio controls src={audioUrl} className="w-full mb-3" />}
      {recording ? (
        <button onClick={stopRecording} className="w-full bg-red-500 text-white py-2 rounded-xl font-semibold">
          ⏹ Stop ({timeLeft}s left)
        </button>
      ) : (
        <button onClick={startRecording} className="w-full bg-indigo-600 text-white py-2 rounded-xl font-semibold">
          {audioUrl ? '🔄 Re-record' : '⏺ Record Intro'}
        </button>
      )}
    </div>
  );
}
```

---

## 🔐 Environment Variables

**`server/.env`**
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/devmatch
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:5173

# Twilio
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS S3 (Voice Intros)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET=devmatch-voice-intros
```

**`client/.env`**
```env
VITE_API_URL=http://localhost:5000
```

---

## ⏱️ Timeline (24-Hour Hackathon) {#timeline}

| Time | Milestone |
|---|---|
| 0–1h | Project setup: Vite + Express + MongoDB Atlas connected |
| 1–3h | Phase 1: Twilio OTP auth end-to-end |
| 3–5h | Phase 2: Profile form + GitHub integration |
| 5–7h | Phase 3: Matching algorithm (with heatmap + verified skill weights) |
| 7–9h | Phase 4: OpenAI match explanation + Team builder + Co-Pilot |
| 9–11h | Phase 5: Socket.io — live matches + real-time chat + co-pilot room |
| 11–13h | Phase 6: Radar chart + Compatibility Score UI |
| 13–15h | Phase 7: Hackathon Discovery — Devpost + Unstop live APIs |
| 15–16h | Phase 8: Skill Verification Quiz (GPT-4o generated) |
| 16–17h | Phase 9: Team Health Dashboard |
| 17–18h | Phase 10: AI Idea Co-Pilot UI + Socket integration |
| 18–19h | Phase 11: Showcase + Leaderboard |
| 19–20h | Phase 12: Availability Heatmap |
| 20–21h | Phase 13 + 14: Blind Mode + XP/Badge system |
| 21–22h | Phase 15 + 16: Invite Links + Voice Intro |
| 22–23h | Deploy: Render (backend) + Vercel (frontend) |
| 23–24h | Demo walkthrough prep + README finalization |

---

## 🧪 Edge Cases & Fallbacks {#edge-cases}

| Scenario | Handling |
|---|---|
| No users to match | Show "Be the first! Invite friends" screen |
| No skill overlap | Score complementary roles higher; show "Perfect complement" tag |
| GitHub fetch fails | Graceful fallback to manual skill input with toast notification |
| OTP not received | Resend button with 60s cooldown |
| OpenAI API timeout | Fallback to template explanation based on role pairing |
| Duplicate phone registration | Find existing user and return fresh JWT |
| Socket disconnect | Auto-reconnect + show offline badge |
| Team < 4 members | Fill remaining slots with "Invite a teammate" placeholder cards |
| Devpost API down | Serve from cache; show "Last updated X mins ago" label |
| Unstop API down | Serve Devpost-only results silently |
| Quiz generation fails | Retry once; fallback to a static question bank per skill |
| Voice upload fails | Show error toast; keep existing intro if present |
| Invite link expired | Redirect to signup with "Invite expired — join anyway" prompt |
| Blind mode — user rejects | Both parties notified anonymously; no identity leak |

---

## 🚀 Deployment

### Backend — Render
1. Push `server/` to GitHub
2. New Web Service → connect repo
3. Build: `npm install` | Start: `node server.js`
4. Add all env vars in Render dashboard

### Frontend — Vercel
1. Push `client/` to GitHub
2. Import on Vercel | Framework: Vite
3. Add `VITE_API_URL=https://your-render-url.onrender.com`

---

## 📦 Install Commands

```bash
# Backend
cd server
npm install express mongoose cors dotenv jsonwebtoken \
  twilio openai axios socket.io multer \
  @aws-sdk/client-s3 cheerio

# Frontend
cd client
npm create vite@latest . -- --template react
npm install axios socket.io-client react-chartjs-2 chart.js \
  react-router-dom tailwindcss @tailwindcss/vite
```

---

## 🎤 Pitch Line

> *"DevMatch is the all-in-one Hackathon OS — it discovers real hackathons from Devpost and Unstop, builds balanced teams using verified GitHub skills and AI matching, lets teams ideate with a conversational AI co-pilot, and showcases projects on a public leaderboard. From finding the right hackathon to shipping and showing off — DevMatch does it all."*

---

*Built for hackathon conditions. Ship fast, ship smart.* 🚀