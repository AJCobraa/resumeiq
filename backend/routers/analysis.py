"""
Analysis router — POST /api/analyze triggers the 3-layer AI pipeline.
Budget guard enforces coin deduction before AI processing.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from firebase_admin_init import verify_token
from core.database import get_db_session
from core.budget_guard import deduct_coins

router = APIRouter(prefix="/api", tags=["analysis"])


class AnalyzeRequest(BaseModel):
    resumeId: str
    jdText: str
    jdUrl: str = ""
    jobTitle: str = ""
    company: str = ""
    portal: str = "other"
    jobId: str | None = None


@router.post("/analyze")
async def analyze(
    body: AnalyzeRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Run 3-layer AI analysis pipeline (embeddings → ATS score → recommendations)."""
    try:
        # Budget guard — deduct coins before AI call
        await deduct_coins(db, uid, "analyze_and_recommend")

        from services.analysis_pipeline import analyze_resume_vs_jd
        result = await analyze_resume_vs_jd(
            db=db,
            user_id=uid,
            resume_id=body.resumeId,
            jd_text=body.jdText,
            jd_url=body.jdUrl,
            job_title=body.jobTitle,
            company=body.company,
            portal=body.portal,
            job_id=body.jobId,
        )
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
