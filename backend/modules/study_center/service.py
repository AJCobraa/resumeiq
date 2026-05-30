"""
Study Center Service Layer.

All business logic for courses, enrollments, and chapter content.
In-memory content cache for markdown files.

Hard isolation: imports ONLY from core/ and models/.
Zero cross-module imports.
"""
import os
import pathlib
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from modules.study_center.models import Course, Chapter, Enrollment, ChapterProgress
from models.postgres_schema import UserCredit, CoinTransaction

# ── In-memory content cache ─────────────────────────
# Keyed by "{course_id}/{filename}" → markdown string
# Populated on first read, returned from cache on subsequent reads.
# No Redis needed until multiple replicas are deployed.
_content_cache: dict[str, str] = {}

# Path to content directory (relative to this file)
_CONTENT_DIR = pathlib.Path(__file__).parent / "content"


async def list_courses(db: AsyncSession, uid: str):
    """All active courses with enrollment status, chapter count, completed count per user."""
    # Fetch all active courses
    result = await db.execute(
        select(Course).where(Course.is_active == True).order_by(Course.created_at)
    )
    courses = result.scalars().all()

    course_list = []
    for course in courses:
        # Chapter count
        ch_count_result = await db.execute(
            select(sa_func.count(Chapter.chapter_id))
            .where(Chapter.course_id == course.course_id)
        )
        chapter_count = ch_count_result.scalar() or 0

        # Check enrollment
        enrollment = await _get_active_enrollment(db, uid, course.course_id)
        is_enrolled = enrollment is not None

        # Completed count
        completed_count = 0
        if is_enrolled:
            comp_result = await db.execute(
                select(sa_func.count(ChapterProgress.id))
                .where(
                    ChapterProgress.user_id == uid,
                    ChapterProgress.course_id == course.course_id,
                    ChapterProgress.completed == True,
                )
            )
            completed_count = comp_result.scalar() or 0

        course_list.append({
            "course_id": course.course_id,
            "title": course.title,
            "description": course.description,
            "tags": course.tags or [],
            "coin_cost": course.coin_cost,
            "chapter_count": chapter_count,
            "completed_count": completed_count,
            "is_enrolled": is_enrolled,
        })

    return course_list


async def get_course_detail(db: AsyncSession, uid: str, course_id: str):
    """Course metadata + ordered chapters with completion/lock status."""
    result = await db.execute(
        select(Course).where(Course.course_id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get enrollment status
    enrollment = await _get_active_enrollment(db, uid, course_id)
    is_enrolled = enrollment is not None
    enrollment_expires_at = enrollment.expires_at if enrollment else None

    # Check if expired
    is_expired = False
    if not is_enrolled:
        exp_result = await db.execute(
            select(Enrollment).where(
                Enrollment.user_id == uid,
                Enrollment.course_id == course_id,
                Enrollment.status == "expired"
            )
        )
        if exp_result.first():
            is_expired = True

    # Get all chapters ordered
    ch_result = await db.execute(
        select(Chapter)
        .where(Chapter.course_id == course_id)
        .order_by(Chapter.order_index)
    )
    chapters = ch_result.scalars().all()

    # Get completed chapter IDs for this user
    completed_ids = set()
    if is_enrolled or True:  # Check progress for free chapters too
        prog_result = await db.execute(
            select(ChapterProgress.chapter_id)
            .where(
                ChapterProgress.user_id == uid,
                ChapterProgress.course_id == course_id,
                ChapterProgress.completed == True,
            )
        )
        completed_ids = {row[0] for row in prog_result.all()}

    chapter_list = []
    for ch in chapters:
        is_locked = not ch.is_free and not is_enrolled
        chapter_list.append({
            "chapter_id": ch.chapter_id,
            "title": ch.title,
            "order_index": ch.order_index,
            "is_free": ch.is_free,
            "is_locked": is_locked,
            "is_completed": ch.chapter_id in completed_ids,
        })

    return {
        "course_id": course.course_id,
        "title": course.title,
        "description": course.description,
        "tags": course.tags or [],
        "coin_cost": course.coin_cost,
        "chapter_count": len(chapters),
        "completed_count": len(completed_ids),
        "is_enrolled": is_enrolled,
        "is_expired": is_expired,
        "enrollment_expires_at": enrollment_expires_at,
        "chapters": chapter_list,
    }


async def enroll_user(db: AsyncSession, uid: str, course_id: str, duration_days: int):
    """Enroll a user in a course or extend enrollment, deducting coins."""
    # Verify course exists and is active
    result = await db.execute(
        select(Course).where(Course.course_id == course_id, Course.is_active == True)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Determine cost
    pricing = {
        1: 500,
        7: 3000,
        30: 12000
    }
    if duration_days not in pricing:
        raise HTTPException(status_code=400, detail="Invalid duration. Choose 1, 7, or 30 days.")
    
    coin_cost = pricing[duration_days]

    # Handle coin deduction
    remaining_balance = 0
    if coin_cost > 0:
        query = select(UserCredit).where(
            UserCredit.user_id == uid
        ).with_for_update()

        credit_result = await db.execute(query)
        user_credit = credit_result.scalar_one_or_none()

        if not user_credit:
            raise HTTPException(
                status_code=402,
                detail="Account not found or no credit balance exists. Please contact support."
            )

        total_available = user_credit.coins_balance + user_credit.topup_coins_balance
        if total_available < coin_cost:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient coins. Need {coin_cost}, have {total_available}. Top up or upgrade your plan."
            )

        if user_credit.coins_balance >= coin_cost:
            user_credit.coins_balance -= coin_cost
        else:
            remainder = coin_cost - user_credit.coins_balance
            user_credit.coins_balance = 0
            user_credit.topup_coins_balance -= remainder

        remaining_balance = user_credit.coins_balance + user_credit.topup_coins_balance

        db.add(CoinTransaction(
            user_id=uid,
            operation=f"course_enrollment:{course_id}:{duration_days}d",
            coins_charged=coin_cost,
        ))

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    duration_delta = timedelta(days=duration_days)

    # Check existing enrollment
    existing = await _get_active_enrollment(db, uid, course_id)
    if existing:
        if existing.expires_at is None:
            # Lifetime access, no need to extend
            raise HTTPException(status_code=400, detail="You already have lifetime access to this course.")
        
        # Extend
        existing.expires_at = existing.expires_at + duration_delta
        existing.coins_paid += coin_cost
        enrollment_id = str(existing.id)
    else:
        # Create new
        import uuid
        new_enrollment = Enrollment(
            id=uuid.uuid4(),
            user_id=uid,
            course_id=course_id,
            status="active",
            expires_at=now + duration_delta,
            coins_paid=coin_cost,
        )
        db.add(new_enrollment)
        enrollment_id = str(new_enrollment.id)

    await db.commit()

    return {
        "enrollment_id": enrollment_id,
        "course_id": course_id,
        "status": "active",
        "coins_paid": coin_cost,
        "remaining_balance": remaining_balance,
    }


async def get_chapter_content(db: AsyncSession, uid: str, course_id: str, chapter_id: str):
    """Get chapter markdown content with auth + enrollment check."""
    # Fetch chapter
    result = await db.execute(
        select(Chapter).where(
            Chapter.chapter_id == chapter_id,
            Chapter.course_id == course_id,
        )
    )
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # If not free, require active enrollment
    if not chapter.is_free:
        enrollment = await _get_active_enrollment(db, uid, course_id)
        if not enrollment:
            raise HTTPException(
                status_code=402,
                detail="Enrollment required to access this chapter. Please enroll first."
            )

    # Read markdown file (with in-memory cache)
    cache_key = f"{course_id}/{chapter.filename}"
    if cache_key not in _content_cache:
        file_path = _CONTENT_DIR / course_id / chapter.filename
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                _content_cache[cache_key] = f.read()
        except FileNotFoundError:
            raise HTTPException(
                status_code=404,
                detail="Chapter content not found"
            )

    content = _content_cache[cache_key]

    # Get prev/next chapter IDs
    all_chapters_result = await db.execute(
        select(Chapter)
        .where(Chapter.course_id == course_id)
        .order_by(Chapter.order_index)
    )
    all_chapters = all_chapters_result.scalars().all()

    prev_id = None
    next_id = None
    for i, ch in enumerate(all_chapters):
        if ch.chapter_id == chapter_id:
            if i > 0:
                prev_id = all_chapters[i - 1].chapter_id
            if i < len(all_chapters) - 1:
                next_id = all_chapters[i + 1].chapter_id
            break

    # Check completion status
    prog_result = await db.execute(
        select(ChapterProgress).where(
            ChapterProgress.user_id == uid,
            ChapterProgress.course_id == course_id,
            ChapterProgress.chapter_id == chapter_id,
            ChapterProgress.completed == True,
        )
    )
    is_completed = prog_result.scalar_one_or_none() is not None

    return {
        "chapter_id": chapter.chapter_id,
        "title": chapter.title,
        "content": content,
        "prev_chapter_id": prev_id,
        "next_chapter_id": next_id,
        "is_completed": is_completed,
    }


async def toggle_chapter_complete(db: AsyncSession, uid: str, course_id: str, chapter_id: str):
    """Toggle completion status on ChapterProgress."""
    # Verify chapter exists
    result = await db.execute(
        select(Chapter).where(
            Chapter.chapter_id == chapter_id,
            Chapter.course_id == course_id,
        )
    )
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Check existing progress
    prog_result = await db.execute(
        select(ChapterProgress).where(
            ChapterProgress.user_id == uid,
            ChapterProgress.course_id == course_id,
            ChapterProgress.chapter_id == chapter_id,
        )
    )
    progress = prog_result.scalar_one_or_none()

    if progress:
        progress.completed = not progress.completed
        progress.completed_at = datetime.now(timezone.utc) if progress.completed else None
        is_completed = progress.completed
    else:
        # Create new progress record
        import uuid
        db.add(ChapterProgress(
            id=uuid.uuid4(),
            user_id=uid,
            course_id=course_id,
            chapter_id=chapter_id,
            completed=True,
            completed_at=datetime.now(timezone.utc)
        ))
        is_completed = True

    await db.commit()
    return {"success": True, "completed": is_completed}


async def _get_active_enrollment(db: AsyncSession, uid: str, course_id: str):
    """
    Check for active enrollment. Auto-expires stale enrollments.
    Returns enrollment or None.
    """
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == uid,
            Enrollment.course_id == course_id,
            Enrollment.status == "active",
        )
    )
    enrollment = result.scalar_one_or_none()

    if not enrollment:
        return None

    # Check expiration
    if enrollment.expires_at is not None:
        now = datetime.now(timezone.utc)
        if enrollment.expires_at < now:
            # Auto-expire
            enrollment.status = "expired"
            await db.commit()
            return None

    return enrollment
