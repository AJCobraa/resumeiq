"""
Study Center FastAPI Router.

All endpoints require verify_token — no exceptions.
Follows the exact auth + DB session patterns from billing.py and jobs.py.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from firebase_admin_init import verify_token
from core.database import get_db_session
from modules.study_center import service as study_service
from modules.study_center import schemas

router = APIRouter(prefix="/api", tags=["Study Center"])


@router.get("/courses")
async def list_courses(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """List all active courses with enrollment and progress info."""
    return await study_service.list_courses(db, uid)


@router.get("/courses/{course_id}")
async def get_course(
    course_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Get course detail with chapter list."""
    return await study_service.get_course_detail(db, uid, course_id)


@router.post("/courses/{course_id}/enroll", response_model=schemas.EnrollResponse)
async def enroll_course(course_id: str, payload: schemas.EnrollmentRequest, uid: str = Depends(verify_token), db: AsyncSession = Depends(get_db_session)):
    """Enroll a user in a course or extend existing enrollment."""
    return await study_service.enroll_user(db, uid, course_id, payload.duration_days)


@router.get("/courses/{course_id}/chapters/{chapter_id}")
async def get_chapter(
    course_id: str,
    chapter_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Get chapter markdown content (auth + enrollment check)."""
    return await study_service.get_chapter_content(db, uid, course_id, chapter_id)


@router.post("/courses/{course_id}/chapters/{chapter_id}/toggle")
async def toggle_chapter(
    course_id: str,
    chapter_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Toggle chapter completion status."""
    return await study_service.toggle_chapter_complete(db, uid, course_id, chapter_id)
