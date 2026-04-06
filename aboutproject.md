# About Project: OpenSource Launchpad AI

## 1) Project Summary
OpenSource Launchpad AI is a single platform that helps open-source teams across the full contribution lifecycle:
- Maintainers can triage and prioritize incoming issues.
- New contributors can discover the best first issues based on their skills.
- Repository owners can generate high-quality README documentation from repository metadata.

Instead of solving these as separate tools, this project combines all three into one system, so open-source projects can onboard contributors faster, reduce issue backlog noise, and improve documentation quality.

## 2) Unified Problem Statement
Open-source growth is blocked by three connected problems:
- Maintainers lose time triaging noisy, duplicate, or low-quality issues.
- Beginners struggle to find relevant and beginner-friendly issues.
- Projects lose adoption because README files are incomplete or inconsistent.

These failures are linked. Poor issue quality reduces maintainer velocity, weak onboarding reduces contributor retention, and poor docs reduce both discovery and trust.

## 3) Objective
Build an AI-assisted open-source workflow engine that:
- Classifies and scores issues for maintainers.
- Recommends personalized first issues to contributors.
- Auto-generates and improves README content from repository signals.

## 4) Target Users
- Maintainers: Need fast triage, de-duplication, and prioritization.
- New contributors: Need relevant first issues matched to skills and interests.
- Repository owners and teams: Need clear, up-to-date project documentation.

## 5) Product Vision
A unified "contributor operating system" for open source:
- Better incoming issues.
- Better issue matching.
- Better documentation.
- Better project health over time.

## 6) Core MVP Features (24-hour achievable)
### A) Issue Intelligence (from OpenIssue)
- Issue classification (bug, feature, docs, question, spam).
- Duplicate detection using embeddings + similarity threshold.
- Priority scoring based on severity, reproducibility, impact, and recency.
- Label suggestions for maintainer review.

### B) First Issue Recommender (from FirstPR Pro)
- Skill input form (languages, frameworks, domains).
- Repo issue fetch and normalization.
- Ranking engine for "best first issue" fit.
- Basic recommendation response with match reason.

### C) README Generator (from ReadmeAI)
- Repository metadata parser (languages, scripts, package files, folder structure).
- AI-generated README draft sections.
- Markdown export and quick preview endpoint.

## 7) Advanced Features (for top teams)
- GitHub webhook bot for real-time issue triage and auto-comment suggestions.
- Personalized recommendation feed per user profile.
- Bookmarking saved issues for later contribution.
- Editable README sections with live preview.
- AI summaries for changelog or release notes.
- Feedback loop that improves ranking and triage based on accepted suggestions.

## 8) End-to-End User Flows
### Flow 1: Maintainer Triage
1. New issue is submitted.
2. System analyzes text and metadata.
3. Returns class, priority score, duplicate candidates, and label suggestions.
4. Maintainer confirms labels and responds quickly.

### Flow 2: New Contributor Onboarding
1. User enters skill profile and interests.
2. System fetches candidate issues from configured repos.
3. Ranking model scores issues for difficulty and relevance.
4. User receives recommendations with explanation and can bookmark.

### Flow 3: Documentation Upgrade
1. User inputs repository URL.
2. Parser extracts metadata and project signals.
3. AI generates README draft with essential sections.
4. User edits, previews, and exports markdown.

## 9) System Design Overview
Frontend Dashboard -> API Gateway -> AI Services -> Storage

Detailed modules:
- Frontend (web app):
  - Maintainer triage panel
  - Contributor recommendation panel
  - README generation panel
- Backend API:
  - Auth and preferences
  - Issue ingestion and analysis
  - Recommendation orchestration
  - README generation orchestration
- AI/NLP Service:
  - Embedding generation
  - Similarity search
  - Classification and scoring
  - Text generation for README and comments
- Data Layer:
  - Relational DB for users, issues, preferences, recommendations
  - Vector DB for issue embeddings and semantic retrieval

## 10) Suggested Tech Stack
- Frontend: React + Tailwind CSS
- Backend: Node.js (Express or Fastify) or Python (FastAPI)
- AI/NLP: OpenAI embeddings and generation models
- Scraping/Fetch: GitHub API (and optional Puppeteer for enrichment)
- Databases:
  - PostgreSQL (core entities)
  - Vector DB (pgvector, Pinecone, or Weaviate)
- Deployment: Vercel/Netlify (frontend) + Render/Fly/Railway (backend)

## 11) API Design (Combined)
- POST /analyze
  - Analyze issue text, classify, score priority, suggest labels, detect duplicates.
- GET /similar
  - Return semantically similar issues for de-duplication.
- POST /label
  - Apply or suggest labels to issue.
- GET /issues
  - Fetch and filter issues from tracked repositories.
- POST /prefs
  - Save user skills and recommendation preferences.
- GET /recommend
  - Return ranked issue recommendations for a user.
- POST /generate
  - Generate README from repository URL and metadata.
- GET /preview
  - Return rendered markdown preview content.
- POST /bookmark
  - Bookmark issue for contributor.
- GET /bookmarks
  - Retrieve saved issues.

## 12) Database Schema (Combined)
### Core Tables
- User
  - id, name, email, github_handle, created_at
- UserPreference
  - id, user_id, skills_json, interests_json, experience_level
- Repository
  - id, owner, name, url, language_stats_json, stars, forks, updated_at
- Issue
  - id, repo_id, github_issue_id, title, body, labels_json, state, created_at
- Embedding
  - id, issue_id, vector, model_name, updated_at
- Recommendation
  - id, user_id, issue_id, score, explanation, created_at
- Bookmark
  - id, user_id, issue_id, created_at
- ReadmeDraft
  - id, repo_id, content_md, version, created_at
- TriageResult
  - id, issue_id, class, priority_score, duplicate_candidates_json, suggested_labels_json

## 13) Ranking and Scoring Logic
### Issue Priority Score (Maintainers)
Weighted score example:
- Severity signal: 35%
- Reproducibility clues: 20%
- User impact: 25%
- Freshness/recency: 10%
- Repository-specific heuristics: 10%

### Recommendation Score (Contributors)
Weighted score example:
- Skill match: 40%
- Difficulty fit: 25%
- Label quality (good first issue/help wanted): 20%
- Activity freshness: 10%
- Contributor interest overlap: 5%

## 14) Engineering Challenges and Mitigation
- Similarity search tuning:
  - Start with cosine threshold baseline and expose threshold in config.
- Ranking relevance:
  - Provide interpretable scoring components and quick manual overrides.
- Parsing accuracy for README generation:
  - Use deterministic parsers first, then AI fill-in for narrative sections.
- GitHub API limits:
  - Add caching and batch requests.

## 15) Edge Cases
- Spam or adversarial issues.
- Empty repositories or missing metadata.
- No suitable beginner issues found.
- Very large repositories with noisy folder structures.
- Duplicate issues with paraphrased wording.

## 16) Evaluation Criteria Alignment
- Innovation:
  - Full lifecycle open-source assistant in one product.
- System Design:
  - Modular architecture with API + NLP + vector retrieval.
- Code Quality:
  - Typed contracts, clear service boundaries, testable ranking functions.
- Completeness:
  - Three integrated workflows in one demo.
- UX:
  - Clear panels for triage, recommendation, and README generation.

## 17) MVP Delivery Scope (Hackathon Reality)
### Must Have
- Working issue analysis endpoint with class, priority, duplicate list.
- Working recommendation endpoint from skill input.
- Working README generation endpoint and markdown output.
- Simple frontend to run all three flows.

### Nice to Have
- GitHub webhook automation.
- Bookmarking and saved profiles.
- Editable README sections with live preview.

## 18) Build Plan (24 Hours)
- Hour 1-3: Repo setup, architecture scaffold, database schema.
- Hour 4-8: Issue triage service and embedding-based similarity.
- Hour 9-12: Recommendation engine and skill preference flow.
- Hour 13-16: README parsing and generation module.
- Hour 17-20: Frontend integration and end-to-end flow.
- Hour 21-24: Testing, polish, demo script, README documentation.

## 19) Mandatory Deliverables Checklist
- Source code repository.
- Setup and run instructions.
- README with architecture and API usage.
- Demo script with 3 user flows.
- Sample test data and example outputs.

## 20) Bonus Ideas
- OpenAI embeddings for duplicate detection and semantic ranking.
- GitHub OAuth for personalized repo scope.
- Automatic PR template suggestion after issue selection.
- Team analytics dashboard (triage time saved, issue quality trends).

## 21) One-Line Pitch
OpenSource Launchpad AI helps maintainers triage faster, helps beginners find the right first contribution, and helps teams ship better documentation from day one.
