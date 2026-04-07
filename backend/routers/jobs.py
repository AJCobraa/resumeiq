"""
Jobs CRUD router — Phase 5 full implementation.
Manages job analyses: list, get, status update, recommendation approve/dismiss, delete.

Section 18.1 addition: GET /api/jobs/check?url= for extension pre-check
Section 19.2 fix: _apply_recommendation_to_resume now uses sectionId + bulletId
  (falls back to text matching for backwards compatibility with old recs)
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from firebase_admin_init import db, verify_token
from services import resume_service
import asyncio

router = APIRouter(prefix="/api", tags=["jobs"])


# ── Request models ───────────────────────────────────
class UpdateStatusRequest(BaseModel):
    status: str  # analyzed | applied | interview | offer | rejected


class UpdateRecommendationRequest(BaseModel):
    recommendationId: str
    action: str  # approve | dismiss | edit
    editedText: str = ""


# ── Helpers ──────────────────────────────────────────
def _job_ref(uid: str, job_id: str):
    return db.collection("users").document(uid).collection("jobs").document(job_id)


# ── Routes ───────────────────────────────────────────
@router.get("/jobs/check")
async def check_job(
    url: str = Query(..., description="The job URL to check"),
    uid: str = Depends(verify_token),
):
    """
    Check if a job URL has already been analyzed by this user.
    Returns { found, jobId, atsScore, isCacheHit } for the most recent match.
    Used by the Chrome Extension to show the 'Previously Analyzed' state.
    """
    if not url:
        return {"found": False}

    try:
        query = (
            db.collection("users")
            .document(uid)
            .collection("jobs")
            .where("jdUrl", "==", url)
            .order_by("createdAt", direction="DESCENDING")
            .limit(1)
            .stream()
        )
        for doc in query:
            d = doc.to_dict()
            return {
                "found": True,
                "jobId": d.get("jobId"),
                "atsScore": d.get("atsScore", 0),
                "jobTitle": d.get("jobTitle", ""),
                "company": d.get("company", ""),
                "isCacheHit": d.get("isCacheHit", False),
                "createdAt": d.get("createdAt"),
            }
    except Exception:
        pass

    return {"found": False}


@router.get("/jobs")
async def get_jobs(uid: str = Depends(verify_token)):
    """List all jobs for authenticated user (summary only)."""
    docs = (
        db.collection("users")
        .document(uid)
        .collection("jobs")
        .order_by("createdAt", direction="DESCENDING")
        .stream()
    )
    results = []
    for doc in docs:
        d = doc.to_dict()
        results.append({
            "jobId": d.get("jobId"),
            "resumeId": d.get("resumeId"),
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
async def get_job(job_id: str, uid: str = Depends(verify_token)):
    """Get full job analysis by ID."""
    doc = _job_ref(uid, job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    return doc.to_dict()


@router.patch("/jobs/{job_id}/status")
async def update_job_status(job_id: str, body: UpdateStatusRequest, uid: str = Depends(verify_token)):
    """Update job application status."""
    ref = _job_ref(uid, job_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    valid = {"analyzed", "applied", "interview", "offer", "rejected"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")

    ref.update({"status": body.status})
    return {"status": body.status}


@router.patch("/jobs/{job_id}/recommendation")
async def update_recommendation(
    job_id: str, body: UpdateRecommendationRequest,
    bg: BackgroundTasks, uid: str = Depends(verify_token),
):
    """
    Approve, dismiss, or edit a recommendation.
    On approve: applies the suggestedText to update the actual resume bullet.
    Uses sectionId + bulletId for targeting (falls back to text match for old recs).
    """
    ref = _job_ref(uid, job_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    data = doc.to_dict()
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

    ref.update({"recommendations": recs})
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
    """
    try:
        ref = db.collection("users").document(uid).collection("resumes").document(resume_id)
        doc = ref.get()
        if not doc.exists:
            return

        data = doc.to_dict()
        sections = data.get("sections", [])\

        updated = False

        # Strategy 1: ID-based targeting (new recommendations have sectionId + bulletId)
        if section_id and bullet_id:
            for section in sections:
                if section.get("sectionId") == section_id:
                    for bullet in section.get("bullets", []):
                        if bullet.get("bulletId") == bullet_id:
                            bullet["text"] = new_text
                            updated = True
                            break
                    # Check items with bullets (projects)
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
            from datetime import datetime, timezone
            ref.update({"sections": sections, "updatedAt": datetime.now(timezone.utc).isoformat()})

            # Refresh embeddings after resume update
            from services import embedding_service
            resume = ref.get().to_dict()
            asyncio.run(embedding_service.update_embeddings_cache(uid, resume_id, resume))
    except Exception:
        pass  # Background task — never crash


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, uid: str = Depends(verify_token)):
    """Delete a job analysis."""
    ref = _job_ref(uid, job_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    ref.delete()
    return {"deleted": True}
