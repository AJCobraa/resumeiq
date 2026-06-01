"""
Study Center ORM Models.

These models extend the shared Base from postgres_schema so they are
auto-created by Base.metadata.create_all in main.py's startup event.

Hard isolation: imports ONLY from core/ and models.postgres_schema.
Zero cross-module imports.
"""
import uuid
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, DateTime, ForeignKey,
    UniqueConstraint, Numeric
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from models.postgres_schema import Base


class Course(Base):
    __tablename__ = "courses"

    course_id = Column(String, primary_key=True)  # e.g. "system-design"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(JSONB, default=list)
    is_active = Column(Boolean, default=True)
    coin_cost = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Chapter(Base):
    __tablename__ = "chapters"

    chapter_id = Column(String, primary_key=True)  # e.g. "sd-02"
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    title = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    filename = Column(String, nullable=False)  # e.g. "02-scale-from-zero.md"
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False)
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    status = Column(String, default="active")  # active / expired / cancelled
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # null = lifetime
    coins_paid = Column(Integer, default=0)


class ChapterProgress(Base):
    __tablename__ = "chapter_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False)
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    chapter_id = Column(String, ForeignKey("chapters.chapter_id"), nullable=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


# ── Study Center V2 Models ──────────────────────────────────────────


class SkillGapSnapshot(Base):
    __tablename__ = "skill_gap_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False, index=True)
    job_id = Column(String, ForeignKey("jobs.job_id"), nullable=False)
    model_key = Column(String, nullable=False)
    coins_spent = Column(Integer, default=0)
    gap_data = Column(JSONB, nullable=True)
    overall_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False, index=True)
    skill_name = Column(String, nullable=False)
    roadmap_type = Column(String, nullable=False)            # "SKILL_GAP" or "CUSTOM"
    experience_level = Column(String, nullable=False, default="intermediate")
    source_job_id = Column(String, nullable=True)
    source_gap_id = Column(UUID(as_uuid=True), nullable=True)
    model_key = Column(String, nullable=False)
    coins_spent = Column(Integer, default=0)
    roadmap_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)


class RoadmapNodeProgress(Base):
    __tablename__ = "roadmap_node_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False)
    roadmap_id = Column(UUID(as_uuid=True), ForeignKey("roadmaps.id"), nullable=False)
    node_id = Column(String, nullable=False)
    status = Column(String, default="NOT_STARTED")           # NOT_STARTED | IN_PROGRESS | DONE
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "roadmap_id", "node_id", name="uq_user_roadmap_node"),
    )


# ── Interview Prep V2 Models ────────────────────────────────────────


class InterviewSession(Base):
    """
    Stores a generated interview prep session tied to a job analysis or custom JD paste.
    Raw JD text is capped at 3,000 chars (enforced at endpoint level) and stored only
    for display purposes. The AI prompt receives extracted metadata, not the raw blob.
    Cache key: job_id + resume_id + sorted(selected_rounds) + difficulty.
    """
    __tablename__ = "interview_sessions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(String, ForeignKey("users.uid"), nullable=False, index=True)
    job_id           = Column(String, ForeignKey("jobs.job_id"), nullable=True)   # null if custom JD
    resume_id        = Column(String, ForeignKey("resumes.resume_id"), nullable=True)
    job_title        = Column(String, default="")
    company          = Column(String, default="")
    company_tier     = Column(String, default="standard")       # faang | unicorn | standard
    # Extracted keyword metadata — raw JD text is capped to 3000 chars by the endpoint
    jd_text          = Column(Text, nullable=True)              # stored for display only, max 3000 chars
    missing_keywords = Column(JSONB, default=list)
    found_keywords   = Column(JSONB, default=list)
    # Wizard configuration
    selected_rounds  = Column(JSONB, default=list)              # ["technical", "behavioral", ...]
    difficulty       = Column(String, default="hard")           # standard | hard | faang
    questions_per_round = Column(Integer, default=10)
    default_mode     = Column(String, default="study")          # study | mock
    model_key        = Column(String, nullable=False)
    coins_spent      = Column(Integer, default=0)
    # Generated content
    prep_data        = Column(JSONB, nullable=True)             # full round+question tree from AI
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AnswerEvaluation(Base):
    """
    Stores a user's submitted answer and the AI's structured evaluation of it.
    Cost: 15 coins flat regardless of model (short structured call).
    """
    __tablename__ = "answer_evaluations"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(String, ForeignKey("users.uid"), nullable=False, index=True)
    session_id      = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    round_id        = Column(String, nullable=False)
    question_id     = Column(String, nullable=False)
    answer_text     = Column(Text, nullable=False)
    evaluation_json = Column(JSONB, nullable=True)   # {score, summary, covered, missing, strengthen}
    score           = Column(Numeric, nullable=True)  # 0.0–10.0
    coins_spent     = Column(Integer, default=15)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class VoiceInterviewToken(Base):
    """
    Short-lived (5-minute TTL) token for opening a Gemini Live API WebSocket session.
    Coins are deducted before token creation.
    The frontend passes this token directly to Google's Live API — backend never proxies audio.
    """
    __tablename__ = "voice_interview_tokens"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token         = Column(String, unique=True, nullable=False, index=True)  # short random UUID
    user_id       = Column(String, ForeignKey("users.uid"), nullable=False)
    session_id    = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False)
    question_id   = Column(String, nullable=False)
    voice_model   = Column(String, nullable=False)     # gemini-audio | gemini-live
    coins_spent   = Column(Integer, default=0)
    expires_at    = Column(DateTime(timezone=True), nullable=False)  # now + 5 min
    used          = Column(Boolean, default=False)     # once redeemed, cannot be reused
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

