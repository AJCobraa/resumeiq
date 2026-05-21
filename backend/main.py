"""
ResumeIQ Backend — FastAPI Application Entry Point

This is the main FastAPI application that wires together all routers,
middleware, and handles the health check endpoint required for Docker
and Kubernetes liveness probes.
"""
import os
from dotenv import load_dotenv

load_dotenv()

import asyncio
import sys

# Force ProactorEventLoop on Windows to support asyncio.create_subprocess_exec (PIPEs)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, resumes, jobs, analysis, stats, billing, webhooks
from core.database import engine
from core.webhook_config import print_webhook_url
from core.exceptions import GemmaOverloadError
from models.postgres_schema import Base

app = FastAPI(
    title="ResumeIQ API",
    description="Resume builder + ATS analysis backend",
    version="1.0.0",
)

@app.exception_handler(GemmaOverloadError)
async def gemma_overload_exception_handler(request: Request, exc: GemmaOverloadError):
    code = "AI_TIMEOUT" if exc.is_timeout else "AI_OVERLOAD"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": code,
            "message": exc.message,
            "detail": "Google AI Studio is under high demand or timed out. This is a temporary transient error."
        },
    )


# ── Database Startup ─────────────────────────────────
@app.on_event("startup")
async def _create_tables():
    """Create all PostgreSQL tables on startup if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed billing catalog (plans + top-up packs)
    from services.billing_service import seed_catalog
    await seed_catalog()
    # Print webhook URL for local tunnel testing
    print_webhook_url()

# ── CORS ─────────────────────────────────────────────
# AGENTS.md rule: allow_origins must be FRONTEND_URL only — never "*"
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ─────────────────────────────────────
# Must exist and return 200 before any other testing (AGENTS.md)
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "resumeiq-backend"}


# ── Mount Routers ────────────────────────────────────
app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(jobs.router)
app.include_router(analysis.router)
app.include_router(stats.router)
app.include_router(billing.router)
app.include_router(webhooks.router)
