"""
Interview Prep V2 Router — job-specific, round-based interview preparation.

Endpoints:
  POST /api/interview/generate          — generate session (wizard config)
  GET  /api/interview/sessions          — list user's sessions
  GET  /api/interview/sessions/{id}     — get full session with prep_data
  POST /api/interview/sessions/{id}/evaluate-answer  — AI evaluate typed answer (15 coins)
  POST /api/interview/sessions/{id}/voice-token       — issue 5-min Live API token (25/35 coins)
  DELETE /api/interview/sessions/{id}  — delete session

Cache key: job_id + resume_id + sorted(selected_rounds) + difficulty
"""
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete

from core.database import get_db_session
from core.budget_guard import deduct_coins
from core.model_registry import get_model, get_operation_name
from core.constants import FIXED_COST
from firebase_admin_init import verify_token
from modules.study_center.models import InterviewSession, AnswerEvaluation, VoiceInterviewToken
from models.postgres_schema import Job, Resume
from services import resume_service
from services.gemma_service import call_model_json, classify_company_tier
from services.roadmap_prompts import build_interview_prep_v2_prompt, build_evaluate_answer_prompt

router = APIRouter(prefix="/api/interview", tags=["Interview Prep V2"])

JD_MAX_CHARS = 3000

VALID_ROUNDS = {"technical", "system_design", "dsa", "behavioral", "lld", "resume_deep_dive"}


# ── Request / Response Models ──────────────────────────────────────────

class GenerateInterviewRequest(BaseModel):
    job_id: Optional[str] = None
    jd_text: Optional[str] = None
    jd_title: Optional[str] = None
    jd_company: Optional[str] = None
    resume_id: str
    model_key: str = "gemma-4-31b"
    selected_rounds: List[str] = Field(default_factory=lambda: ["technical", "behavioral", "resume_deep_dive"])
    questions_per_round: int = Field(default=10, ge=5, le=15)
    difficulty: str = Field(default="hard")
    default_mode: str = Field(default="study")  # study | mock

    @validator("difficulty")
    def validate_difficulty(cls, v):
        if v not in ("standard", "hard", "faang"):
            raise ValueError("difficulty must be standard, hard, or faang")
        return v

    @validator("selected_rounds")
    def validate_rounds(cls, v):
        invalid = set(v) - VALID_ROUNDS
        if invalid:
            raise ValueError(f"Invalid round IDs: {invalid}")
        if not v:
            raise ValueError("At least one round must be selected")
        return v


class EvaluateAnswerRequest(BaseModel):
    round_id: str
    question_id: str
    answer_text: str = Field(..., min_length=10)


class VoiceTokenRequest(BaseModel):
    question_id: str
    voice_model_key: str = "gemini-audio"  # gemini-audio | gemini-live


# ── Helper: build cache key ─────────────────────────────────────────────

def _build_cache_key(job_id: Optional[str], resume_id: str, selected_rounds: list, difficulty: str) -> str:
    sorted_rounds = json.dumps(sorted(selected_rounds))
    return f"{job_id or 'custom'}:{resume_id}:{sorted_rounds}:{difficulty}"


# ── Helper: extract question from prep_data ──────────────────────────────

def _find_question(prep_data: dict, round_id: str, question_id: str) -> Optional[dict]:
    for rnd in prep_data.get("rounds", []):
        if rnd["id"] == round_id:
            for q in rnd.get("questions", []):
                if q["id"] == question_id:
                    return q, rnd
    return None, None


# ── POST /api/interview/generate ────────────────────────────────────────

@router.post("/generate")
async def generate_interview_session(
    body: GenerateInterviewRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate a new interview prep session.
    Step 0: JD length validation (before coin deduction).
    Cache check: returns existing session if config matches.
    """
    # ── Step 0: Input validation ──
    if not body.job_id and not body.jd_text:
        raise HTTPException(status_code=400, detail="Either job_id or jd_text must be provided.")

    if body.jd_text:
        trimmed = body.jd_text.strip()
        if len(trimmed) > JD_MAX_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"JD text exceeds {JD_MAX_CHARS} characters ({len(trimmed)} provided). "
                       f"Please trim to the key responsibilities and required skills sections."
            )

    # ── Step 1: Resolve job context ──
    job_title = "Software Engineer"
    company = "Tech Company"
    missing_keywords: list = []
    found_keywords: list = []
    jd_text_stored: Optional[str] = None

    if body.job_id:
        result = await db.execute(select(Job).where(Job.job_id == body.job_id, Job.user_id == uid))
        job_row = result.scalar_one_or_none()
        if not job_row:
            raise HTTPException(status_code=404, detail="Job not found.")
        jd = job_row.job_data or {}
        job_title = jd.get("jobTitle", "Software Engineer")
        company = jd.get("company", "Tech Company")
        missing_keywords = jd.get("missingKeywords", [])
        found_keywords = jd.get("strongMatches", [])
    elif body.jd_text:
        jd_text_stored = body.jd_text.strip()
        job_title = body.jd_title.strip() if body.jd_title else "Software Engineer"
        company = body.jd_company.strip() if body.jd_company else "Tech Company"

        # If we are missing title or company, optionally extract (though the frontend now requires both)
        if not body.jd_title or not body.jd_company:
            # Extract metadata from raw JD text using AI
            extract_prompt = f"""Extract the following from this job description. Return ONLY valid JSON.
JOB DESCRIPTION:
{jd_text_stored}

Return:
{{
  "job_title": "extracted job title or 'Software Engineer'",
  "company": "extracted company name or 'Tech Company'",
  "missing_keywords": [],
  "found_keywords": []
}}
Note: missing_keywords and found_keywords should both be empty arrays — these are determined separately."""
            try:
                extracted = await call_model_json(extract_prompt, user_id=uid, operation="parse_resume_pdf")
                if not body.jd_title:
                    job_title = extracted.get("job_title", "Software Engineer")
                if not body.jd_company:
                    company = extracted.get("company", "Tech Company")
            except Exception:
                pass  # Fall back to defaults if extraction fails

    # ── Step 2: Verify resume ownership ──
    result = await db.execute(select(Resume).where(Resume.resume_id == body.resume_id, Resume.user_id == uid))
    resume_row = result.scalar_one_or_none()
    if not resume_row:
        raise HTTPException(status_code=404, detail="Resume not found.")
    resume_data = resume_row.resume_data or {}
    resume_summary = resume_service.summarize_resume(resume_data)

    # ── Step 3: Cache check ──
    cache_key = _build_cache_key(body.job_id, body.resume_id, body.selected_rounds, body.difficulty)
    existing_result = await db.execute(
        select(InterviewSession)
        .where(
            InterviewSession.user_id == uid,
            InterviewSession.job_id == body.job_id,
            InterviewSession.resume_id == body.resume_id,
        )
        .order_by(InterviewSession.created_at.desc())
        .limit(1)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing_cache_key = _build_cache_key(
            existing.job_id,
            existing.resume_id,
            existing.selected_rounds or [],
            existing.difficulty or "hard"
        )
        if existing_cache_key == cache_key:
            return _serialize_session(existing, cached=True, config_changed=False)
        # If cache key is different, fall through to generate a new session.

    # ── Step 4: Classify company tier ──
    tier_info = classify_company_tier(company)
    company_tier = tier_info["tier"]
    company_tier_label = tier_info["label"]
    style_guide = tier_info["styleGuide"]

    # ── Step 5: Deduct coins (model-tiered) ──
    operation = get_operation_name("generate_interview_prep_v2", body.model_key)
    coins_spent = await deduct_coins(db, uid, operation)

    # ── Step 6: Build prompt and call AI ──
    model_info = get_model(body.model_key)
    prompt = build_interview_prep_v2_prompt(
        job_title=job_title,
        company=company,
        company_tier=company_tier,
        company_tier_label=company_tier_label,
        difficulty=body.difficulty,
        questions_per_round=body.questions_per_round,
        selected_rounds=body.selected_rounds,
        missing_keywords=missing_keywords,
        found_keywords=found_keywords,
        resume_summary=resume_summary,
        style_guide=style_guide,
    )

    try:
        prep_data = await call_model_json(
            prompt,
            user_id=uid,
            operation="generate_interview_prep_v2",
            model_override=model_info["api_model_id"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # ── Step 7: Save session ──
    session = InterviewSession(
        user_id=uid,
        job_id=body.job_id,
        resume_id=body.resume_id,
        job_title=job_title,
        company=company,
        company_tier=company_tier,
        jd_text=jd_text_stored,
        missing_keywords=missing_keywords,
        found_keywords=found_keywords,
        selected_rounds=body.selected_rounds,
        difficulty=body.difficulty,
        questions_per_round=body.questions_per_round,
        default_mode=body.default_mode,
        model_key=body.model_key,
        coins_spent=coins_spent,
        prep_data=prep_data,
    )
    db.add(session)

    # ── Step 8: Link session ID back to job row ──
    if body.job_id:
        result2 = await db.execute(select(Job).where(Job.job_id == body.job_id, Job.user_id == uid))
        job_row2 = result2.scalar_one_or_none()
        if job_row2:
            from sqlalchemy.orm.attributes import flag_modified
            data = dict(job_row2.job_data)
            data["interviewV2SessionId"] = str(session.id)
            job_row2.job_data = data
            flag_modified(job_row2, "job_data")

    await db.commit()
    await db.refresh(session)
    return _serialize_session(session, cached=False, config_changed=False)


# ── GET /api/interview/sessions ─────────────────────────────────────────

@router.get("/sessions")
async def list_interview_sessions(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """List all sessions for the authenticated user (summary only, no prep_data)."""
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == uid)
        .order_by(InterviewSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [_serialize_session(s, include_prep_data=False) for s in sessions]


# ── GET /api/interview/sessions/{session_id} ────────────────────────────

@router.get("/sessions/{session_id}")
async def get_interview_session(
    session_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Get full session including prep_data (all rounds and questions)."""
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == uid)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Also fetch evaluations for this session (for progress stats)
    eval_result = await db.execute(
        select(AnswerEvaluation)
        .where(AnswerEvaluation.session_id == session_id, AnswerEvaluation.user_id == uid)
    )
    evaluations = eval_result.scalars().all()

    serialized = _serialize_session(session, include_prep_data=True)
    serialized["evaluations"] = [
        {
            "round_id": e.round_id,
            "question_id": e.question_id,
            "score": float(e.score) if e.score else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in evaluations
    ]
    return serialized


# ── POST /api/interview/sessions/{id}/evaluate-answer ───────────────────

@router.post("/sessions/{session_id}/evaluate-answer")
async def evaluate_answer(
    session_id: str,
    body: EvaluateAnswerRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Evaluate a candidate's submitted answer using AI.
    Cost: 15 coins flat regardless of model.
    """
    # Verify session ownership
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == uid)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Find the question in prep_data
    q, rnd = _find_question(session.prep_data or {}, body.round_id, body.question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found in this session.")

    # Deduct coins
    await deduct_coins(db, uid, "evaluate_answer")

    # Build evaluation prompt and call AI
    prompt = build_evaluate_answer_prompt(
        question_text=q["text"],
        key_concepts=q.get("key_concepts", []),
        answer_text=body.answer_text,
        job_title=session.job_title,
        company=session.company,
    )

    try:
        evaluation = await call_model_json(prompt, user_id=uid, operation="evaluate_answer")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

    # Store evaluation
    eval_record = AnswerEvaluation(
        user_id=uid,
        session_id=session_id,
        round_id=body.round_id,
        question_id=body.question_id,
        answer_text=body.answer_text,
        evaluation_json=evaluation,
        score=evaluation.get("score"),
        coins_spent=FIXED_COST["evaluate_answer"],
    )
    db.add(eval_record)
    await db.commit()

    return {
        "evaluation_id": str(eval_record.id),
        **evaluation,
    }


# ── POST /api/interview/sessions/{id}/voice-token ───────────────────────

@router.post("/sessions/{session_id}/voice-token")
async def issue_voice_token(
    session_id: str,
    body: VoiceTokenRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Issue a short-lived (5-minute) token for opening a Gemini Live API WebSocket.
    Coins are deducted before token creation.
    The frontend passes this token directly to Google's Live API — backend never proxies audio.
    """
    from core.model_registry import get_voice_model

    # Verify session ownership
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == uid)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Validate voice model
    try:
        voice_model_info = get_voice_model(body.voice_model_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Deduct coins
    operation = voice_model_info["cost_operation"]
    coins_spent = await deduct_coins(db, uid, operation)

    # Generate short-lived token
    token_value = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    token_record = VoiceInterviewToken(
        token=token_value,
        user_id=uid,
        session_id=session_id,
        question_id=body.question_id,
        voice_model=body.voice_model_key,
        coins_spent=coins_spent,
        expires_at=expires_at,
        used=False,
    )
    db.add(token_record)
    await db.commit()

    return {
        "token": token_value,
        "voice_model_id": voice_model_info["api_model_id"],
        "expires_at": expires_at.isoformat(),
        "question_id": body.question_id,
    }


# ── DELETE /api/interview/sessions/{id} ─────────────────────────────────

@router.delete("/sessions/{session_id}")
async def delete_interview_session(
    session_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a session and all its associated evaluations and voice tokens."""
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == uid)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Cascade delete evaluations and tokens
    await db.execute(sa_delete(AnswerEvaluation).where(AnswerEvaluation.session_id == session_id))
    await db.execute(sa_delete(VoiceInterviewToken).where(VoiceInterviewToken.session_id == session_id))
    await db.delete(session)
    await db.commit()
    return {"deleted": True}


# ── Serializer ───────────────────────────────────────────────────────────

def _serialize_session(session: InterviewSession, cached: bool = False, config_changed: bool = False, include_prep_data: bool = True) -> dict:
    out = {
        "id": str(session.id),
        "job_id": session.job_id,
        "resume_id": session.resume_id,
        "job_title": session.job_title,
        "company": session.company,
        "company_tier": session.company_tier,
        "selected_rounds": session.selected_rounds,
        "difficulty": session.difficulty,
        "questions_per_round": session.questions_per_round,
        "default_mode": session.default_mode,
        "model_key": session.model_key,
        "coins_spent": session.coins_spent,
        "cached": cached,
        "config_changed": config_changed,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
    }
    if include_prep_data:
        out["prep_data"] = session.prep_data
    return out
