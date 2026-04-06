# 🎓 ChatTutor — AI-Powered Personalized Learning Platform

> An intelligent AI tutoring system with user profiling, context memory, and career-focused learning. Built with React + FastAPI + Google Gemini.

---

## 🌟 Features

| Feature | Description |
|---|---|
| 🔐 **User Profiles** | Register as Student, Job Aspirant, or Self Learner |
| 💬 **AI Chat Tutor** | Personalized answers with **last-5-chat context memory** |
| 🗺️ **Adaptive Roadmap** | AI-generated chronological learning milestones based on your goal |
| 🎤 **Interview Prep** | Role-specific technical and behavioral questions and hints |
| 📈 **Daily Tracking** | Real-time analytics tracking your score average and daily progress |
| 📚 **Study Mode** | Generate structured notes, key points, examples & practice questions |
| 📝 **Mock Tests** | Auto-generated 20 MCQs • Adjustable difficulty • Deep Post-test Review |
| 📥 **PDF Download** | Download AI-generated notes as professionally styled PDFs |
| 🧠 **Adaptive AI** | Gemini prompt engineering tailored to your role + goal |
| 📋 **History** | Full conversation history with expand/collapse UI |

---

## 🏗️ System Architecture

```
ChatTutor/
├── backend/                    # Python FastAPI server
│   ├── main.py                 # App entry + CORS + routers
│   ├── database.py             # SQLite via SQLAlchemy
│   ├── models.py               # DB: Users, Conversations, Content
│   ├── schemas.py              # Pydantic request/response models
│   ├── routes/
│   │   ├── auth.py             # POST /register, POST /login
│   │   ├── chat.py             # POST /chat/ask
│   │   ├── content.py          # POST /content/generate-notes & quiz
│   │   └── download.py         # GET /download/{user_id}/{topic}
│   ├── services/
│   │   ├── gemini.py           # Gemini API + prompt engineering
│   │   ├── memory.py           # Context memory (last 5 chats)
│   │   └── pdf.py              # reportlab PDF generation
│   └── requirements.txt
│
└── frontend/                   # React + Vite
    └── src/
        ├── pages/
        │   ├── Landing.jsx     # Hero + features
        │   ├── Register.jsx    # 3-step profile creation
        │   ├── Login.jsx       # Name-based login
        │   ├── Dashboard.jsx   # Main hub
        │   ├── Chat.jsx        # AI chat interface
        │   ├── StudyTopic.jsx  # Notes generator
        │   ├── MockTest.jsx    # Quiz system
        │   └── History.jsx     # Conversation log
        ├── components/
        │   ├── Navbar.jsx      # Responsive nav
        │   └── Sidebar.jsx     # App navigation
        ├── context/
        │   └── UserContext.jsx # Global user state + localStorage
        └── api/
            └── client.js       # Axios API client
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + React Router v6 |
| **Styling** | Vanilla CSS (glassmorphism dark theme) |
| **Backend** | Python 3.10+ + FastAPI |
| **AI** | Google Gemini 1.5 Flash |
| **Database** | SQLite via SQLAlchemy |
| **PDF** | reportlab |
| **HTTP Client** | Axios |

---

## 🚀 Quick Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key ([Get one free](https://aistudio.google.com/app/apikey))

### 1. Clone & Navigate
```bash
cd ChatTutor
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure API Key
copy .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_key_here

# Start server
python main.py
```

Backend runs at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs** (Swagger UI)

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create user profile |
| `POST` | `/auth/login` | Login by name |
| `GET`  | `/auth/users/{id}` | Get profile |
| `GET`  | `/auth/users/{id}/history` | Get chat history |

### Chat (with Memory)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/ask` | Ask a question (uses last 5 chats as context) |

### Content Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/content/generate-notes` | Generate study notes |
| `POST` | `/content/generate-quiz` | Generate 5 MCQs |

### Download

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/download/{user_id}/{topic}` | Download notes as PDF |

### Example Requests

```json
// POST /auth/register
{
  "name": "Priya Sharma",
  "age": 21,
  "education": "BSc Biology 2nd Year",
  "goal": "Score 90%+ in Biology, understand reproduction system",
  "role": "student"
}

// POST /chat/ask
{
  "user_id": 1,
  "question": "Explain the reproduction system in plants"
}

// POST /content/generate-notes
{
  "user_id": 1,
  "topic": "Reproduction System"
}

// POST /content/generate-quiz
{
  "user_id": 1,
  "topic": "Reproduction System",
  "difficulty": "medium"
}
```

---

## 🗄️ Database Schema

```sql
-- Users
id | name | age | education | goal | role | created_at

-- Conversations (Chat History + Memory)
id | user_id | question | answer | timestamp

-- Contents (Notes + Quizzes)
id | user_id | topic | notes | quiz | created_at
```

---

## 🧠 AI Prompt Engineering

ChatTutor uses **role-aware, profile-personalized prompts**:

### System Prompt Structure
```
You are ChatTutor — an intelligent AI tutor and career mentor.

ALWAYS:
- Personalize answers based on the user's education and goal
- Use simple, clear language with real-life examples
- Structure answers with: Explanation → Key Points → Example → Follow-up

FORMAT:
📖 Explanation | 🔑 Key Points | 💡 Example | ❓ Think About This | 🎯 Why this matters for you

[Role-specific instructions]:
- Student    → Subject learning, syllabus-appropriate
- Job Aspirant → Exam prep, interview readiness
- Self Learner  → Conceptual depth, cross-domain connections
```

### Context Memory
- Stores last 5 conversations per user in SQLite
- Prepended to every AI request as conversation context
- Enables progressive, coherent learning sessions

---

## 👥 User Flows

### Student Flow
1. Register → Select "Student"  
2. Fill: Name=Priya, Age=21, Education=BSc Biology, Goal=Score 90% in Biology
3. Dashboard → Study Mode → Enter "Reproduction System"
4. Receive: Notes + Key Points + Examples + Practice Questions
5. Take Mock Test → Get score + explanations
6. Download notes as PDF

### Job Aspirant Flow
1. Register → Select "Job Aspirant"
2. Fill: Name=Rahul, Goal=Clear UPSC Prelims 2025
3. Chat: "What are the key topics for UPSC Polity?"
4. Generate Quiz on "Fundamental Rights" → difficulty=hard
5. History → Review all past AI answers

### Self Learner Flow
1. Register → Select "Self Learner"
2. Chat: "Explain Neural Networks like I'm a beginner"
3. AI remembers context → follow up "What is backpropagation?"
4. Study Mode → "Machine Learning Basics" → Full notes
5. Download PDF → Offline study

---

## 📊 Sample Output

### Notes (excerpt)
```
# 📚 Reproduction System — Study Notes

## 🎯 Overview
The reproduction system is the biological process by which organisms 
produce offspring. For BSc Biology students...

## 🔑 Key Points to Remember
- Sexual reproduction involves fusion of gametes
- Asexual reproduction requires only one parent
...

## 🎯 Why This Matters for Priya
Since you're pursuing BSc Biology with the goal of scoring 90%+, 
understanding the Reproduction System is crucial for your practicals...
```

### Quiz (format)
```json
{
  "question": "Which hormone triggers ovulation in females?",
  "options": [
    {"label": "A", "text": "FSH"},
    {"label": "B", "text": "LH"},
    {"label": "C", "text": "Estrogen"},
    {"label": "D", "text": "Progesterone"}
  ],
  "correct": "B",
  "explanation": "Luteinizing Hormone (LH) surge triggers ovulation..."
}
```

---

## 🧪 Edge Cases Handled

| Scenario | Handling |
|---|---|
| Empty question/topic | 400 validation error with clear message |
| Invalid age | Pydantic range validation (5–100) |
| Unknown AI topic | Gemini still generates best-effort content |
| Duplicate username | 409 Conflict error with helpful message |
| AI API failure | 500 error with retry guidance |
| No notes before download | 404 error: "Generate notes first" |
| Very long queries | 2000-char limit on questions |
| Malformed quiz JSON | Regex extraction + retry logic |

---

## 🛡️ Security Notes

- This demo uses name-based auth (no password) — suitable for hackathons
- For production: add JWT tokens + bcrypt password hashing
- API key stored in `.env` (never committed to git)
- Add `.env` to `.gitignore`

---

## 🚢 Deployment

### Backend (Railway / Render)
```bash
# Set environment variable: GEMINI_API_KEY
# Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel / Netlify)
```bash
npm run build
# Update api/client.js baseURL to your backend URL
```

---

## 📝 License

MIT License — Built for educational purposes.

---

*Built with ❤️ using React · FastAPI · Google Gemini AI*
