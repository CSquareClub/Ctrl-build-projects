"""
ChatTutor — Gemini AI Service
Handles all LLM interactions with personalized prompt engineering
"""

import os
import json
import re
import warnings
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Suppress deprecation warnings from google-generativeai SDK
warnings.filterwarnings("ignore", category=DeprecationWarning, module="google")

# ─── Configure Gemini ─────────────────────────────────────────────────────

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


# ─── Role-Specific System Prompts ─────────────────────────────────────────

ROLE_INSTRUCTIONS = {
    "student": """You are tutoring a student. Focus on:
- Subject understanding with clear conceptual explanations
- Use school/college level language appropriate to their education
- Provide diagrams or structured explanations when helpful
- Connect topics to their syllabus/exams""",

    "job_aspirant": """You are a career mentor for a job aspirant. Focus on:
- Exam/interview preparation with practical tips
- Current affairs relevance for government exams
- Skill-building for private sector roles
- Concise bullet-point formats suitable for revision""",

    "self_learner": """You are guiding a passionate self-learner. Focus on:
- Deep conceptual clarity with 'why it works' explanations
- Real-world applications and use cases
- Encouraging curiosity and exploration
- Connecting ideas across disciplines"""
}

BASE_SYSTEM_PROMPT = """You are ChatTutor — an intelligent AI tutor and career mentor.

ALWAYS:
- Personalize answers based on the user's education and goal
- Use simple, clear language with real-life examples
- Avoid repetition — always provide fresh insights
- Structure answers with clear headings and bullet points

FORMAT every response with:
1. 📖 **Explanation** — Clean, personalized answer
2. 🔑 **Key Points** — 3-5 bullet points
3. 💡 **Example** — A real-world or practical example
4. ❓ **Think About This** — One follow-up question to deepen understanding
5. 🎯 **Why this matters for you:** — Personalized relevance to their goal

{role_instructions}"""


def build_system_prompt(role: str) -> str:
    """Build role-aware system prompt"""
    instructions = ROLE_INSTRUCTIONS.get(role, ROLE_INSTRUCTIONS["student"])
    return BASE_SYSTEM_PROMPT.format(role_instructions=instructions)


def build_user_context(name: str, education: str, goal: str, role: str) -> str:
    """Format the user profile context for the AI"""
    role_display = role.replace("_", " ").title()
    return f"""User Profile:
- Name: {name}
- Role: {role_display}
- Education: {education}
- Goal: {goal}"""


# ─── Chat ─────────────────────────────────────────────────────────────────

def get_chat_answer(
    question: str,
    user_profile: dict,
    chat_history: list
) -> str:
    """
    Generate personalized answer with context memory.
    chat_history: list of {"question": ..., "answer": ...} dicts (last 5)
    """
    system_prompt = build_system_prompt(user_profile["role"])
    user_context = build_user_context(
        user_profile["name"],
        user_profile["education"],
        user_profile["goal"],
        user_profile["role"]
    )

    # Build conversation history for context
    history_text = ""
    if chat_history:
        history_text = "\n\nPrevious conversation context:\n"
        for item in chat_history:
            history_text += f"Q: {item['question']}\nA: {item['answer'][:200]}...\n\n"

    full_prompt = f"""{system_prompt}

{user_context}
{history_text}

Current question: {question}

Provide a thorough, personalized answer:"""

    response = model.generate_content(full_prompt)
    # Handle blocked/empty responses
    if not response.text:
        return "I'm sorry, I couldn't generate a response for that question. Please try rephrasing."
    return response.text


# ─── Notes Generator ──────────────────────────────────────────────────────

NOTES_PROMPT = """You are an expert educational content creator.

User Profile:
{user_context}

Generate comprehensive study notes for the topic: "{topic}"

Structure the notes EXACTLY as follows (use markdown):

# 📚 {topic} — Study Notes

## 🎯 Overview
[2-3 sentence introduction]

## 📖 Core Concepts
[Explain main concepts with sub-headings]

## 🔑 Key Points to Remember
[Bullet list of 5-8 key takeaways]

## 💡 Real-World Examples
[2-3 concrete examples relevant to the user's background]

## 🔗 Important Terms (Glossary)
[5-7 key terms with brief definitions]

## ❓ Practice Questions
[5 important questions to test understanding]

## 📋 Summary
[Concise 3-4 line summary]

## 🎯 Why This Matters for {name}
[Personalized relevance to their goal: {goal}]

Make it {role_display} appropriate, engaging, and thorough."""


def generate_notes(topic: str, user_profile: dict) -> str:
    """Generate structured study notes for a topic"""
    user_context = build_user_context(
        user_profile["name"],
        user_profile["education"],
        user_profile["goal"],
        user_profile["role"]
    )
    role_display = user_profile["role"].replace("_", " ").title()

    prompt = NOTES_PROMPT.format(
        user_context=user_context,
        topic=topic,
        name=user_profile["name"],
        goal=user_profile["goal"],
        role_display=role_display
    )

    response = model.generate_content(prompt)
    if not response.text:
        raise ValueError("AI returned empty notes response")
    return response.text


# ─── Quiz Generator ───────────────────────────────────────────────────────

QUIZ_PROMPT = """You are an expert MCQ exam creator.

User Profile:
{user_context}

Generate exactly 10 multiple choice questions on the topic: "{topic}"
Difficulty level: {difficulty}

IMPORTANT: Return ONLY valid JSON — no markdown, no extra text. Ensure there are exactly 10 questions.

Format:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": [
        {{"label": "A", "text": "Option A text"}},
        {{"label": "B", "text": "Option B text"}},
        {{"label": "C", "text": "Option C text"}},
        {{"label": "D", "text": "Option D text"}}
      ],
      "correct": "A",
      "explanation": "Brief explanation of why A is correct"
    }}
  ]
}}

Make questions appropriate for someone with education: {education} pursuing goal: {goal}.
{difficulty_instruction}"""

DIFFICULTY_INSTRUCTIONS = {
    "easy": "Use straightforward questions testing basic definitions and facts.",
    "medium": "Mix conceptual and application-based questions.",
    "hard": "Include analytical and reasoning-based questions."
}


def generate_quiz(topic: str, user_profile: dict, difficulty: str = "medium") -> list:
    """Generate 5 MCQs for a topic. Returns list of question dicts."""
    user_context = build_user_context(
        user_profile["name"],
        user_profile["education"],
        user_profile["goal"],
        user_profile["role"]
    )
    diff_instruction = DIFFICULTY_INSTRUCTIONS.get(difficulty, DIFFICULTY_INSTRUCTIONS["medium"])

    prompt = QUIZ_PROMPT.format(
        user_context=user_context,
        topic=topic,
        difficulty=difficulty,
        education=user_profile["education"],
        goal=user_profile["goal"],
        difficulty_instruction=diff_instruction
    )

    response = model.generate_content(prompt)
    if not response.text:
        raise ValueError("AI returned empty quiz response")
    raw = response.text.strip()

    # Strip markdown code fences if present (```json ... ```)
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw.strip())

    # Extract JSON object
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(0)

    data = json.loads(raw)
    questions = data.get("questions", [])
    if not questions:
        raise ValueError("Quiz returned no questions")
    return questions


# ─── Roadmap & Interview Generators ───────────────────────────────────────

ROADMAP_PROMPT = """You are an expert career counselor and educational planner.
Create a step-by-step adaptive learning roadmap for this user.

User Profile:
{user_context}

Format the response EXACTLY as valid JSON with NO markdown blocks around it:
{{
  "goal": "Brief restatement of their goal",
  "modules": [
    {{
      "title": "Module 1 Name (e.g. Foundation)",
      "description": "What they will learn here",
      "topics": ["Topic 1", "Topic 2", "Topic 3"]
    }},
    {{ ... }}
  ]
}}

Generate 4-6 sequential modules."""

def generate_roadmap(user_profile: dict) -> dict:
    user_context = build_user_context(
        user_profile["name"],
        user_profile["education"],
        user_profile["goal"],
        user_profile["role"]
    )
    prompt = ROADMAP_PROMPT.format(user_context=user_context)
    res = model.generate_content(prompt).text.strip()
    res = re.sub(r'^```(?:json)?\s*', '', res)
    res = re.sub(r'\s*```$', '', res.strip())
    json_match = re.search(r'\{.*\}', res, re.DOTALL)
    if json_match:
        res = json_match.group(0)
    return json.loads(res)


INTERVIEW_PROMPT = """You are a senior technical interviewer and HR manager.
Generate {count} common and highly effective interview questions tailored for this user's targeted role based on their goal.

User Profile:
{user_context}

Format EXACTLY as valid JSON with NO markdown blocks around it:
{{
  "role_targeted": "Brief name of the role they are targeting",
  "questions": [
    {{
      "question": "The interview question",
      "answer_hint": "A 2-3 sentence hint or key points expected in the answer"
    }},
    {{ ... }}
  ]
}}"""

def generate_interview_questions(user_profile: dict, count: int = 5) -> dict:
    user_context = build_user_context(
        user_profile["name"],
        user_profile["education"],
        user_profile["goal"],
        user_profile["role"]
    )
    prompt = INTERVIEW_PROMPT.format(user_context=user_context, count=count)
    res = model.generate_content(prompt).text.strip()
    res = re.sub(r'^```(?:json)?\s*', '', res)
    res = re.sub(r'\s*```$', '', res.strip())
    json_match = re.search(r'\{.*\}', res, re.DOTALL)
    if json_match:
        res = json_match.group(0)
    return json.loads(res)
