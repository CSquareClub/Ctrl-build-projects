# OpenIssue Backend

AI-powered GitHub issue triage backend built with FastAPI.

## Features

### AI Services (Gemini-powered)
- **Classification**: Categorizes issues into bug/feature/docs/question
- **Priority Assignment**: Assigns low/medium/high/critical priority
- **Label Generation**: Suggests relevant labels (ui, api, database, auth, etc.)
- **Embeddings**: Gemini text-embedding-004 for semantic similarity
- **Fallback**: Heuristic-based classification when AI unavailable

### Vector Database
- **ChromaDB**: Persistent vector storage for issue embeddings
- **Similarity Search**: Find semantically similar issues using cosine similarity

### Authentication & Authorization
- **Firebase Auth**: JWT token verification for protected endpoints
- **GitHub OAuth**: Direct GitHub login flow at `/auth/login`

### GitHub Integration
- **Repository Listing**: Fetch user's GitHub repositories
- **Issue Fetching**: Get issues from specific repositories
- **Token Support**: Header (`X-GitHub-Token`) or env (`GITHUB_TOKEN`) fallback

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/analyze` | POST | Optional | AI-powered issue analysis |
| `/analyze/batch` | POST | Optional | Batch issue analysis |
| `/repos` | GET | Required | User repositories |
| `/repos/{owner}/{repo}/issues` | GET | Required | Repo issues |
| `/issues` | GET/POST/PUT/DELETE | Optional | CRUD operations |
| `/similar` | POST | Optional | Find similar issues |
| `/conflicts` | POST | Optional | Code comparison |
| `/auth/login` | GET | No | Start GitHub OAuth flow |
| `/auth/callback` | GET | No | GitHub OAuth callback |
| `/health` | GET | No | Health check |

## Quick Start

### 1. Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
# Edit .env with your keys
```

**Required:**
- `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/)

**Optional:**
- `GITHUB_TOKEN` - For GitHub API access ([create token](https://github.com/settings/tokens))
- `FIREBASE_CREDENTIALS_PATH` - For Firebase auth

### 3. Run

```bash
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── db.py                # In-memory issue storage
│   ├── routes/              # API endpoints
│   │   ├── analyze.py       # Issue analysis
│   │   ├── repos.py         # GitHub repos/issues
│   │   ├── auth.py          # GitHub OAuth
│   │   ├── issues.py        # CRUD operations
│   │   ├── similar.py       # Similarity search
│   │   ├── conflicts.py     # Code comparison
│   │   └── health.py        # Health check
│   ├── services/            # Business logic
│   │   ├── classifier_service.py  # AI triage (Gemini + heuristics)
│   │   ├── gemini_service.py      # Gemini embeddings
│   │   ├── chromadb_service.py    # Vector database
│   │   ├── github_service.py      # GitHub API client
│   │   ├── firebase_auth.py       # Firebase JWT verification
│   │   ├── embedding_service.py   # Sentence transformers (fallback)
│   │   ├── vector_service.py      # FAISS (fallback)
│   │   └── priority_service.py    # Priority assignment
│   ├── schemas/             # Pydantic models
│   ├── models/              # Data models
│   └── utils/               # Utilities (issue storage)
├── data/                    # Persistent data (ChromaDB, issues.json)
├── tests/                   # Test files
├── requirements.txt         # Dependencies
├── .env.example             # Environment template
└── Dockerfile               # Container build
```

## Dependencies

- FastAPI + Uvicorn
- ChromaDB (vector database)
- Gemini API (classification & embeddings)
- Firebase Admin SDK (authentication)
- httpx (GitHub API client)
- sentence-transformers (fallback embeddings)
- Typer (CLI)

## CLI Usage

The CLI lets you post issues to the backend from the command line.

### Quick Examples

```bash
# Post an issue directly
python -m cli.post_issue post --title "Login broken" --description "Users cannot login"

# Analyze before posting (shows AI triage, asks for confirmation)
python -m cli.post_issue post --title "App crash" --description "Crashes on start" --analyze

# Interactive mode (prompts for all fields)
python -m cli.post_issue post --interactive

# Post from a markdown file (first line = title, rest = description)
python -m cli.post_issue post --file bug-report.md

# Check server status and queue
python -m cli.post_issue status

# Retry failed posts (offline queue)
python -m cli.post_issue flush-queue
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OI_SERVER_URL` | Backend server URL | `http://localhost:8000` |
| `OI_API_TOKEN` | API token for auth | (none) |

### Offline Queue

If the server is unreachable, issues are saved to `data/pending_issues.json`. Use `flush-queue` to retry when the server is back online.

## Key Design Decisions

1. **Gemini-first**: All AI features use Gemini API with graceful fallbacks
2. **No OpenAI dependency**: Fully Gemini-powered
3. **Graceful degradation**: Works without AI/ChromaDB using heuristics
4. **Token flexibility**: GitHub token via header or env variable
