"""
Study Center Pydantic Schemas for API request/response models.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EnrollmentRequest(BaseModel):
    duration_days: int


class ChapterListItem(BaseModel):
    chapter_id: str
    title: str
    order_index: int
    is_free: bool
    is_locked: bool
    is_completed: bool


class CourseListItem(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    tags: list = []
    coin_cost: int
    chapter_count: int
    completed_count: int
    is_enrolled: bool


class CourseDetail(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    tags: list = []
    coin_cost: int
    chapter_count: int
    completed_count: int
    is_enrolled: bool
    is_expired: bool = False
    enrollment_expires_at: Optional[datetime] = None
    chapters: list[ChapterListItem] = []


class ChapterContent(BaseModel):
    chapter_id: str
    title: str
    content: str
    prev_chapter_id: Optional[str] = None
    next_chapter_id: Optional[str] = None
    is_completed: bool


class EnrollResponse(BaseModel):
    enrollment_id: str
    course_id: str
    status: str
    coins_paid: int
    remaining_balance: int


# ── Study Center V2 Schemas ──────────────────────────────────────────

class RoadmapQuestionsRequest(BaseModel):
    skill_name: str
    role_context: Optional[str] = None
    experience_level: str

class RoadmapGenerateRequest(BaseModel):
    skill_name: str
    model_key: str
    roadmap_type: str
    experience_level: str
    source_job_id: Optional[str] = None
    source_gap_id: Optional[str] = None
    role_context: Optional[str] = None
    gap_status: Optional[str] = None
    answers: Optional[dict] = None

class NodeProgressRequest(BaseModel):
    status: str

