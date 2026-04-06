"""
ChatTutor — FastAPI Main Application
Entry point: starts the server, configures CORS, mounts all routers
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routes import auth, chat, content, download


# ─── Lifespan: Initialize DB on startup ──────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all DB tables on startup"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized — tables created")
    yield
    print("🛑 Application shutting down")


# ─── App Instance ─────────────────────────────────────────────────────────

app = FastAPI(
    title="ChatTutor API",
    description="AI-powered personalized learning platform backend",
    version="1.0.0",
    lifespan=lifespan
)


# ─── CORS (Allow React frontend) ──────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Mount Routers ────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(content.router)
app.include_router(download.router)


# ─── Health Check ─────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "message": "🎓 ChatTutor API is running!",
        "version": "1.0.0",
        "endpoints": {
            "register": "POST /auth/register",
            "login": "POST /auth/login",
            "ask": "POST /chat/ask",
            "notes": "POST /content/generate-notes",
            "quiz": "POST /content/generate-quiz",
            "download": "GET /download/{user_id}/{topic}",
            "docs": "/docs"
        }
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


# ─── Run directly ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
