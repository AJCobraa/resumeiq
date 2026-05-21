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
import uuid

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
            # Apply change in background task
            # Pass rec_type to help background task pick the right strategy
            rec_type = target.get("type", "")
            bg.add_task(
                _apply_recommendation_to_resume,
                uid, resume_id, section_id, bullet_id, current_text, final_text, rec_type
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


async def _apply_recommendation_to_resume(user_id: str, resume_id: str, section_id: str, bullet_id: str, current_text: str, new_text: str, rec_type: str = ""):
    """
    Background task to update the resume with the approved recommendation.
    Uses a 4-strategy approach to target the correct data point.
    """
    try:
        from core.database import async_session
        from sqlalchemy.orm.attributes import flag_modified
        from datetime import datetime, timezone
        from models.postgres_schema import Resume
        from services import embedding_service
        
        async with async_session() as db_session:
            result = await db_session.execute(
                select(Resume).where(Resume.resume_id == resume_id, Resume.user_id == user_id)
            )
            row = result.scalar_one_or_none()
            if not row:
                print(f"[apply_rec] [ERROR] Resume {resume_id} not found for user {user_id}")
                return

            data = row.resume_data
            updated = False
            sections = data.get("sections", [])

            # Strategy 1: Professional Summary (meta.summary)
            # Direct match on type or explicit IDs
            if rec_type in ["summary", "add_section"] or section_id == "meta" or bullet_id == "summary":
                meta = data.get("meta", {})
                meta["summary"] = new_text
                data["meta"] = meta
                updated = True
                print(f"[apply_rec] Success: Applied summary update via Strategy 1 (Summary Type/ID)")

            # Strategy 2 & 3: ID-based (Experience, Projects, Skills)
            if not updated and section_id and bullet_id:
                for section in sections:
                    if section.get("sectionId") == section_id:
                        stype = section.get("type", "")
                        
                        # Strategy 2: Skills Categories
                        if stype == "skills" and rec_type in ["skills", "add_skill"]:
                            found_cat = False
                            for cat in section.get("categories", []):
                                if cat.get("categoryId") == bullet_id:
                                    # Handle potential "Label: Item1, Item2" format in new_text
                                    clean_text = new_text
                                    if ":" in new_text and ";" not in new_text:
                                        # Only split if there's one colon and no semicolon (simple label: items)
                                        _, clean_text = new_text.split(":", 1)
                                    
                                    # Convert comma-separated string back to list for skills
                                    cat["items"] = [s.strip() for s in clean_text.split(",") if s.strip()]
                                    updated = True
                                    found_cat = True
                                    print(f"[apply_rec] Success: Updated existing skill category via Strategy 2 (ID match)")
                                    break
                            
                            # If no ID match but bid is 'new' or it's an add_skill, try parsing suggestedText
                            if not found_cat and (bullet_id == "new" or rec_type == "add_skill"):
                                # Parse "Category: Item1, Item2; Category2: Item3"
                                skill_parts = new_text.split(";")
                                for part in skill_parts:
                                    if ":" in part:
                                        label, items_str = part.split(":", 1)
                                        items = [i.strip() for i in items_str.split(",") if i.strip()]
                                        # Check if category already exists by name
                                        existing_cat = next((c for c in section.get("categories", []) if c.get("label", "").lower() == label.strip().lower()), None)
                                        if existing_cat:
                                            existing_cat["items"] = items
                                        else:
                                            section.setdefault("categories", []).append({
                                                "categoryId": str(uuid.uuid4()),
                                                "label": label.strip(),
                                                "items": items
                                            })
                                        updated = True
                                if updated:
                                    print(f"[apply_rec] Success: Added/Updated skill categories via Strategy 2 (New/Parse)")
                        
                        # Strategy 2: Experience/Projects bullets
                        elif stype in ["experience", "projects"]:
                            # Check bullets directly in section (experience)
                            for bullet in section.get("bullets", []):
                                if bullet.get("bulletId") == bullet_id:
                                    bullet["text"] = new_text
                                    updated = True
                                    print(f"[apply_rec] Success: Applied bullet update via Strategy 2")
                                    break
                            
                            # Check bullets inside items (projects)
                            if not updated:
                                for item in section.get("items", []):
                                    for bullet in item.get("bullets", []):
                                        if bullet.get("bulletId") == bullet_id:
                                            bullet["text"] = new_text
                                            updated = True
                                            print(f"[apply_rec] Success: Applied project bullet update via Strategy 2")
                                            break
                                    if updated: break
                        if updated: break

            # Strategy 4: Text-based fallback (for robustness)
            if not updated and current_text:
                normalized_target = current_text.strip().lower()
                
                # Check summary
                meta = data.get("meta", {})
                if meta.get("summary") and meta["summary"].strip().lower() == normalized_target:
                    meta["summary"] = new_text
                    data["meta"] = meta
                    updated = True
                    print(f"[apply_rec] Success: Applied summary update via Strategy 4 (text match)")
                
                if not updated:
                    for section in sections:
                        stype = section.get("type", "")
                        
                        if stype == "skills" and rec_type in ["skills", "add_skill"]:
                            for cat in section.get("categories", []):
                                if cat.get("label", "").strip().lower() == normalized_target:
                                    cat["items"] = [s.strip() for s in new_text.split(",") if s.strip()]
                                    updated = True
                                    print(f"[apply_rec] Success: Applied skills update via Strategy 4 (label match)")
                                    break
                        
                        elif stype in ["experience", "projects"]:
                            for bullet in section.get("bullets", []):
                                if bullet.get("text", "").strip().lower() == normalized_target:
                                    bullet["text"] = new_text
                                    updated = True
                                    print(f"[apply_rec] Success: Applied bullet update via Strategy 4 (text match)")
                                    break
                            
                            if not updated:
                                for item in section.get("items", []):
                                    for bullet in item.get("bullets", []):
                                        if bullet.get("text", "").strip().lower() == normalized_target:
                                            bullet["text"] = new_text
                                            updated = True
                                            print(f"[apply_rec] Success: Applied project bullet update via Strategy 4 (text match)")
                                            break
                                    if updated: break
                        if updated: break

            if updated:
                data["updatedAt"] = datetime.now(timezone.utc).isoformat()
                row.resume_data = data
                flag_modified(row, "resume_data")
                row.updated_at = datetime.now(timezone.utc)
                await db_session.commit()
                print(f"[apply_rec] Success: Resume {resume_id} updated and committed")
                
                # Refresh embeddings - this is important for future analysis
                try:
                    await embedding_service.update_embeddings_cache(user_id, resume_id, data)
                except Exception as e:
                    print(f"[apply_rec] Warning: Failed to refresh embeddings: {str(e)}")
            else:
                print(f"[apply_rec] [WARNING] Could not find target for update: type={rec_type}, sid={section_id}, bid={bullet_id}, text='{current_text[:30]}...'")

    except Exception as e:
        print(f"[apply_rec] Error in background task: {str(e)}")
        import traceback
        traceback.print_exc()



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
    except (HTTPException, GemmaOverloadError):
        raise
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
