import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from db.database import init_db
from routers import auth, repos, issues, moderation, webhooks, recommend, readme, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="GitWise AI",
    description="AI-powered GitHub companion — issue triage, PR moderation, contributor recommender, README generator.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow the React frontend
# ---------------------------------------------------------------------------
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router,        prefix="/auth",       tags=["Auth"])
app.include_router(repos.router,       prefix="/repos",      tags=["Repositories"])
app.include_router(issues.router,      prefix="/issues",     tags=["Issue Triage"])
app.include_router(moderation.router,  prefix="/moderation", tags=["Moderation"])
app.include_router(webhooks.router,    prefix="/webhooks",   tags=["Webhooks"])
app.include_router(recommend.router,                         tags=["Recommender"])
app.include_router(readme.router,      prefix="/readme",     tags=["README Generator"])
app.include_router(dashboard.router,   prefix="/dashboard",  tags=["Dashboard"])


@app.get("/ping", tags=["Health"])
async def ping():
    """Keep-alive endpoint — call every 10 min to prevent Render cold starts."""
    return {"status": "ok"}
