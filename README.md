================================================================
CHATTUTOR — PROJECT EXPLANATION
================================================================

WHAT WE ARE BUILDING
--------------------
ChatTutor is an AI-powered tutoring web app built for the AI & Machine Learning track.

The core idea is simple: students often struggle to get personalized
help when they need it. ChatTutor solves this by giving every student
their own on-demand AI tutor that can answer questions, explain
concepts step by step, and remember the context of the conversation
— just like a real tutor would.

----------------------------------------------------------------

HOW IT WORKS
------------
1. The student opens the web app (frontend/index.html) in a browser.

2. They can optionally pick a subject (Math, Physics, CS, History,
   etc.) from the sidebar to give the AI more context.

3. They type a question and hit Send.

4. The frontend sends the question to our Python backend via an
   API call (POST /ask).

5. The backend passes the full conversation history to Claude
   (Anthropic's AI model) along with a custom system prompt that
   instructs it to behave like an encouraging, step-by-step tutor.

6. Claude's response is sent back and displayed in the chat.

7. Every follow-up question in the same session includes the full
   conversation history, so the AI remembers what was discussed
   and builds on it — this is the "context memory" feature.

----------------------------------------------------------------

WHAT EACH PART DOES
--------------------
backend/main.py
  - The brain of the server. Built with FastAPI (Python).
  - Handles incoming questions, manages session history,
    calls the Anthropic API, and returns answers.
  - Routes: POST /ask, GET /history, DELETE /history, GET /health

backend/requirements.txt
  - Lists the Python libraries needed to run the backend.
  - Key ones: fastapi, uvicorn, anthropic

backend/.env.example
  - Template for storing the Anthropic API key securely.
  - The real key goes in a .env file (not uploaded to GitHub).

frontend/index.html
  - The entire user interface in a single file.
  - No frameworks, no build step — just open it in a browser.
  - Features: subject selector, chat bubbles, typing indicator,
    markdown rendering, session history sidebar.

README.md
  - Full documentation: setup steps, API reference, architecture
    diagram, edge cases, and how to run the project.
  - This is what judges and reviewers read first.

.gitignore
  - Tells Git which files to ignore (API keys, temp files, etc.)

----------------------------------------------------------------

THE TECH STACK
--------------
- Python 3.10+       → backend language
- FastAPI            → web framework for the API
- Anthropic Claude   → the AI model powering the tutor
- Uvicorn            → server that runs FastAPI
- HTML / CSS / JS    → frontend (no frameworks needed)

----------------------------------------------------------------

WHY THIS APPROACH
-----------------
- FastAPI is fast to write and produces automatic API docs,
  which is great for a 24-hour hackathon.

- Keeping the full conversation history per session (in memory)
  is the simplest way to give Claude "memory" without needing
  a database — perfect for an MVP.

- A single-file frontend means anyone can run it instantly
  without installing Node.js or any build tools.

- The custom system prompt makes Claude act as a tutor:
  it breaks things down step by step, uses analogies, asks
  follow-up questions, and adapts to what the student knows.

----------------------------------------------------------------

WHAT MAKES IT STAND OUT
------------------------
- Adaptive learning: the AI tracks what was asked earlier in
  the session and adjusts its explanations accordingly.

- Subject context: tagging a subject at the start helps Claude
  tune its vocabulary and examples to that domain.

- Clean, polished UI: dark-themed, responsive, with smooth
  animations — looks professional for demo day.

- Complete documentation: README covers architecture, API,
  edge cases, and curl test commands.

----------------------------------------------------------------

HOW TO RUN IT (QUICK VERSION)
------------------------------
1. Add your AI API key to backend/.env
2. Run:  pip install -r backend/requirements.txt
3. Run:  uvicorn backend.main:app --reload --port 8000
4. Open: frontend/index.html in your browser
5. Start asking questions!

================================================================
