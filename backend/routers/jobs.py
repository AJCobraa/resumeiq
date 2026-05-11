"""
Jobs CRUD router — manages job analyses.
List, get, status update, recommendation approve/dismiss, delete, interview prep.

All data operations use PostgreSQL via AsyncSession.
Job data stored in `jobs.job_data` JSONB column.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from firebase_admin_init import verify_token
from core.database import get_db_session
from sqlalchemy.orm.attributes import flag_modified
from models.postgres_schema import Job, Resume
from services import resume_service, gemma_service
from core import budget_guard
from datetime import datetime, timezone
import asyncio

router = APIRouter(prefix="/api", tags=["jobs"])


# ── Request models ───────────────────────────────────
class UpdateStatusRequest(BaseModel):
    status: str  # analyzed | applied | interview | offer | rejected


class UpdateRecommendationRequest(BaseModel):
    recommendationId: str
    action: str  # approve | dismiss | edit
    editedText: str = ""


# ── Routes ───────────────────────────────────────────
@router.get("/jobs/check")
async def check_job(
    url: str = Query(..., description="The job URL to check"),
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Check if a job URL has already been analyzed by this user.
    Returns { found, jobId, atsScore, isCacheHit } for the most recent match.
    Used by the Chrome Extension to show the 'Previously Analyzed' state.
    """
    if not url:
        return {"found": False}

    try:
        from sqlalchemy import cast, String
        result = await db.execute(
            select(Job)
            .where(Job.user_id == uid)
            .where(Job.job_data["jdUrl"].astext == url)
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row:
            d = row.job_data or {}
            return {
                "found": True,
                "jobId": d.get("jobId"),
                "atsScore": d.get("atsScore", 0),
                "jobTitle": d.get("jobTitle", ""),
                "company": d.get("company", ""),
                "resumeTitle": d.get("resumeTitle", ""),
                "isCacheHit": d.get("isCacheHit", False),
                "createdAt": d.get("createdAt"),
            }
    except Exception:
        pass

    return {"found": False}


@router.get("/jobs")
async def get_jobs(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """List all jobs for authenticated user (summary only)."""
    result = await db.execute(
        select(Job)
        .where(Job.user_id == uid)
        .order_by(Job.created_at.desc())
        .limit(50)
    )
    rows = result.scalars().all()
    results = []
    for row in rows:
        d = row.job_data or {}
        results.append({
            "jobId": d.get("jobId"),
            "resumeId": d.get("resumeId"),
            "resumeTitle": d.get("resumeTitle", ""),
            "jobTitle": d.get("jobTitle", ""),
            "company": d.get("company", ""),
            "portal": d.get("portal", "other"),
            "atsScore": d.get("atsScore", 0),
            "semanticScore": d.get("semanticScore", 0),
            "status": d.get("status", "analyzed"),
            "isCacheHit": d.get("isCacheHit", False),
            "recommendationCount": len(d.get("recommendations", [])),
            "approvedCount": len([r for r in d.get("recommendations", []) if r.get("status") == "approved"]),
            "createdAt": d.get("createdAt"),
        })
    return results


@router.get("/jobs/{job_id}")
async def get_job(
    job_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Get full job analysis by ID."""
    result = await db.execute(
        select(Job).where(Job.job_id == job_id, Job.user_id == uid)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return row.job_data


@router.patch("/jobs/{job_id}/status")
async def update_job_status(
    job_id: str, body: UpdateStatusRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Update job application status."""
    result = await db.execute(
        select(Job).where(Job.job_id == job_id, Job.user_id == uid)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    valid = {"analyzed", "applied", "interview", "offer", "rejected"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")

    data = dict(row.job_data)
    data["status"] = body.status
    row.job_data = data
    flag_modified(row, "job_data")
    await db.commit()
    return {"status": body.status}


@router.patch("/jobs/{job_id}/recommendation")
async def update_recommendation(
    job_id: str, body: UpdateRecommendationRequest,
    bg: BackgroundTasks,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Approve, dismiss, or edit a recommendation.
    On approve: applies the suggestedText to update the actual resume bullet.
    Uses sectionId + bulletId for targeting (falls back to text match for old recs).
    """
    result = await db.execute(
        select(Job).where(Job.job_id == job_id, Job.user_id == uid)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    data = dict(row.job_data)
    recs = data.get("recommendations", [])

    # Find the recommendation
    target = None
    for r in recs:
        if r.get("recommendationId") == body.recommendationId:
            target = r
            break

    if not target:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if body.action == "approve":
        target["status"] = "approved"
        final_text = body.editedText if body.editedText else target.get("suggestedText", "")

        # Apply to resume using ID-based targeting
        resume_id = data.get("resumeId")
        if resume_id and final_text:
            section_id = target.get("sectionId", "")
            bullet_id = target.get("bulletId", "")
            current_text = target.get("currentText", "")
            bg.add_task(
                _apply_recommendation_to_resume,
                uid, resume_id, section_id, bullet_id, current_text, final_text
            )

    elif body.action == "dismiss":
        target["status"] = "dismissed"

    elif body.action == "edit":
        if not body.editedText:
            raise HTTPException(status_code=400, detail="editedText required for edit action")
        target["suggestedText"] = body.editedText
        target["status"] = "pending"

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be: approve, dismiss, edit")

    row.job_data = data
    flag_modified(row, "job_data")
    await db.commit()
    return target


def _apply_recommendation_to_resume(
    uid: str,
    resume_id: str,
    section_id: str,
    bullet_id: str,
    current_text: str,
    new_text: str,
):
    """
    Background task: update a resume bullet using ID-based targeting.
    Falls back to text matching for backwards compatibility with old recommendation objects
    that don't have sectionId/bulletId.
    Uses a new DB session since this runs in a background thread.
    """
    try:
        async def _do():
            from core.database import async_session
            async with async_session() as db_session:
                result = await db_session.execute(
                    select(Resume).where(Resume.resume_id == resume_id, Resume.user_id == uid)
                )
                row = result.scalar_one_or_none()
                if not row:
                    return

                data = dict(row.resume_data)
                sections = data.get("sections", [])
                updated = False

                # Strategy 1: ID-based targeting (new recommendations have sectionId + bulletId)
                if section_id and bullet_id:
                    for section in sections:
                        if section.get("sectionId") == section_id:
                            # 1a: Regular bullets (experience, achievements)
                            for bullet in section.get("bullets", []):
                                if bullet.get("bulletId") == bullet_id:
                                    bullet["text"] = new_text
                                    updated = True
                                    break
                            # 1b: Skills category items — bulletId is the categoryId here
                            if not updated and section.get("type") == "skills":
                                for cat in section.get("categories", []):
                                    if cat.get("categoryId") == bullet_id:
                                        cat["items"] = [s.strip() for s in new_text.split(",") if s.strip()]
                                        updated = True
                                        break
                            # 1c: Items with nested bullets (projects)
                            if not updated:
                                for item in section.get("items", []):
                                    for bullet in item.get("bullets", []):
                                        if bullet.get("bulletId") == bullet_id:
                                            bullet["text"] = new_text
                                            updated = True
                                            break
                                    if updated:
                                        break
                            break

                # Strategy 2: Text-based fallback (for old rec objects without IDs)
                if not updated and current_text:
                    for section in sections:
                        for bullet in section.get("bullets", []):
                            if bullet.get("text") == current_text:
                                bullet["text"] = new_text
                                updated = True
                                break
                        if not updated:
                            for item in section.get("items", []):
                                for bullet in item.get("bullets", []):
                                    if bullet.get("text") == current_text:
                                        bullet["text"] = new_text
                                        updated = True
                                        break
                                if updated:
                                    break
                        if updated:
                            break

                if updated:
                    data["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    row.resume_data = data
                    flag_modified(row, "resume_data")
                    row.updated_at = datetime.now(timezone.utc)
                    await db_session.commit()

                    # Refresh embeddings after resume update
                    from services import embedding_service
                    await embedding_service.update_embeddings_cache(uid, resume_id, data)

        asyncio.run(_do())
    except Exception:
        pass  # Background task — never crash


@router.post("/jobs/{job_id}/interview-prep")
async def generate_job_interview_prep(
    job_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate or retrieve interview prep questions for a specific job.
    Calibrates questions based on company tier and resume gaps.
    """
    result = await db.execute(
        select(Job).where(Job.job_id == job_id, Job.user_id == uid)
    )
    job_row = result.scalar_one_or_none()
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = job_row.job_data or {}
    resume_id = job_data.get("resumeId")
    if not resume_id:
        raise HTTPException(status_code=400, detail="Job has no associated resume")

    # 1. Check Cache
    cached_prep = job_data.get("interviewPrep")
    cached_at = job_data.get("interviewPrepGeneratedAt")
    cached_resume_id = job_data.get("interviewPrepResumeId")

    if cached_prep and cached_resume_id == resume_id:
        return {
            "interviewPrep": cached_prep,
            "cached": True,
            "generatedAt": cached_at,
            "companyTier": job_data.get("interviewPrepTier", "standard"),
            "companyLabel": job_data.get("interviewPrepTierLabel", "Tech Company"),
        }

    # 2. Fetch Context
    resume_data = await resume_service.get_resume(db, uid, resume_id)
    if not resume_data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_summary = resume_service.summarize_resume(resume_data)
    missing_keywords = job_data.get("missingKeywords", [])
    job_title = job_data.get("jobTitle", "Target Role")
    company = job_data.get("company", "Tech Company")

    # 3. Classify and Generate
    company_tier = gemma_service.classify_company_tier(company)

    # 3.5 Deduct Coins (Pre-flight)
    await budget_guard.deduct_coins(db, uid, "generate_interview_prep")

    try:
        prep_list = await gemma_service.generate_interview_prep(
            missing_keywords=missing_keywords,
            resume_summary=resume_summary,
            job_title=job_title,
            company=company,
            company_tier=company_tier,
            user_id=uid
        )

        # 4. Save to PostgreSQL
        now = datetime.now(timezone.utc).isoformat()
        data = dict(job_row.job_data)
        data["interviewPrep"] = prep_list
        data["interviewPrepGeneratedAt"] = now
        data["interviewPrepResumeId"] = resume_id
        data["interviewPrepTier"] = company_tier["tier"]
        data["interviewPrepTierLabel"] = company_tier["label"]
        job_row.job_data = data
        flag_modified(job_row, "job_data")
        await db.commit()

        return {
            "interviewPrep": prep_list,
            "cached": False,
            "generatedAt": now,
            "companyTier": company_tier["tier"],
            "companyLabel": company_tier["label"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate interview prep: {str(e)}")


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a job analysis."""
    result = await db.execute(
        select(Job).where(Job.job_id == job_id, Job.user_id == uid)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    await db.delete(row)
    await db.commit()
    return {"deleted": True}
