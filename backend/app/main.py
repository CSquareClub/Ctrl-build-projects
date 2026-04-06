from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

from app.db import load_issues
from app.routes import analyze, health, issues, similar

# Load backend .env so external API keys are available in all run modes.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load issues from JSON file (if any) when server starts
    load_issues()
    yield
    # Any cleanup goes here

app = FastAPI(
    title="OpenIssue API",
    description="Intelligent GitHub issue triage assistant",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production to specific frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, prefix="/analyze", tags=["Analyze"])
app.include_router(issues.router, prefix="/issues", tags=["Issues"])
app.include_router(similar.router, prefix="/similar", tags=["Similar"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to OpenIssue API. Visit /docs for Swagger UI documentation."
    }
