# [Open Source - Unified Project]

## 🚀 Project Title  
**GitWise AI**

## 🧠 Problem Statement  
Open-source projects are held back by three interconnected barriers: maintainers waste hours triaging noisy, duplicate, and poorly labeled issues; new contributors cannot easily discover high-quality "good first issues" because of missing skill-based filtering; and poor or outdated documentation drastically reduces adoption and onboarding speed. These problems create a fragmented ecosystem where collaboration is inefficient for everyone.

## 🎯 Objective  
Build a single, unified AI-powered GitHub companion platform that simultaneously:
- Triages and labels issues intelligently for maintainers
- Delivers personalized "good first issue" recommendations for beginners
- Auto-generates professional, high-quality READMEs from repo metadata and issues

All three core problems solved in one cohesive product.

## 👥 Target Users  
- **Maintainers** (issue triage & automation)  
- **Beginner contributors** (personalized first-PR discovery)  
- **Project owners / developers** (instant documentation)

## ⚙️ Core Features (MVP - achievable in 24 hours)  
- GitHub repo connection + issue/repo scraping & parsing  
- Issue classification, duplicate detection (embeddings), and priority scoring  
- Skill-based personalized issue ranking & recommendations  
- AI-powered README generation (with sections, badges, contribution guidelines)  
- Unified dashboard showing triage results, recommendations, and generated README preview

## 🌟 Advanced Features (for top teams)  
- Personalized contributor feed + bookmarking/saved issues  
- GitHub OAuth + real-time webhook bot (auto-label, auto-comment, duplicate alerts)  
- Editable README sections with live preview and one-click PR creation  
- AI issue summaries and suggested replies

## 🔄 User Flow  
1. GitHub OAuth login → Connect repo(s) or input skills  
2. **One-click actions**:
   - Maintainers → "Analyze Repo" → instant triage, labels, duplicates, priorities  
   - Contributors → "Find My First Issue" → skill input → ranked recommendations across connected repos  
   - Anyone → "Generate README" → AI produces full markdown  
3. View unified results in dashboard (triage table + recommendation cards + README preview)  
4. Export labels/PRs or copy README

## 🏗️ System Design Overview  
GitHub API + Scraper → Parser & Embeddings Engine → Multi-Task AI Service (classification + ranking + generation) → Unified API + Dashboard

## 🔌 API Design  
- `POST /connect-repo` – OAuth + repo metadata fetch  
- `POST /analyze` – Issue classification, duplicate detection, priority scoring  
- `POST /prefs` – Save user skills/preferences  
- `GET /recommend` – Personalized ranked issues (skill + repo matching)  
- `POST /generate-readme` – Full README from repo + issues data  
- `GET /dashboard` – Combined triage + recommendations + preview  

## 🗄️ Database Schema  
- **Users** (id, github_token, skills_json, prefs)  
- **Repos** (id, github_url, metadata, last_synced)  
- **Issues** (id, repo_id, title, body, labels, embedding_vector, priority_score, duplicate_of)  
- **Embeddings** (for fast similarity search)  
- **GeneratedReadmes** (repo_id, markdown_content, generated_at)

## ⚠️ Engineering Challenges  
- Multi-objective ranking (relevance for beginners + urgency for maintainers)  
- Embedding-based duplicate detection + semantic search tuning  
- Accurate repo parsing + README generation quality  
- Keeping everything responsive within 24-hour MVP constraints

## 🧪 Edge Cases  
- No issues found in repo  
- Very large repos (pagination, rate-limit handling)  
- Spam/vague issues  
- Empty or new repos with zero metadata  
- Users with no skills input (fallback to popularity-based ranking)  
- Conflicting maintainer/contributor views on same repo

## 🰐 Suggested Tech Stack  
**Python + FastAPI** (backend, embeddings, AI)  
- GitHub API (PyGithub/Octokit) + Playwright (fallback scraping)  
- Sentence-Transformers or OpenAI embeddings (for classification, duplicates, ranking)  
- LangChain / HuggingFace for README generation  
- Simple React/Next.js or Streamlit frontend (dashboard)  
- Qdrant / FAISS for vector DB (in-memory for MVP)  

(Combines best of all three original stacks while staying lightweight for 24 hours)

## 📊 Evaluation Criteria  
- Innovation  
- System Design  
- Code Quality  
- Completeness  
- UX  

## 📦 Deliverables (MANDATORY)  
- Source code (monorepo or clear backend/frontend folders)  
- README with setup, .env example, and how to run in <10 minutes  
- Demo video or live link (optional but strongly recommended)

## ⏱️ Constraints  
- 24 hours  
- Focus on MVP first (core triage + recommendations + README generation)  
- Must work with public GitHub repos (OAuth bonus for private)

## 💡 Bonus Ideas  
- GitHub OAuth + one-click "Apply Label" or "Create PR with this README"  
- Live README preview with Markdown editor  
- Webhook bot that auto-comments on new issues  
- "Repo Health Score" dashboard (triage quality + documentation completeness)  
- Export recommendations as "Good First Issues" badge for any repo

**This single project (GitWise AI) directly solves all three original challenges at once — no need to choose between OpenIssue, FirstPR Pro, or ReadmeAI.**