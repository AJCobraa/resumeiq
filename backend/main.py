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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, resumes, jobs, analysis, stats

app = FastAPI(
    title="ResumeIQ API",
    description="Resume builder + ATS analysis backend",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────
# AGENTS.md rule: allow_origins must be FRONTEND_URL only — never "*"
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
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
