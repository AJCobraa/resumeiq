"""
Analysis router — Phase 4 full implementation.
POST /api/analyze triggers the 3-layer AI pipeline.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from firebase_admin_init import verify_token

router = APIRouter(prefix="/api", tags=["analysis"])


class AnalyzeRequest(BaseModel):
    resumeId: str
    jdText: str
    jdUrl: str = ""
    jobTitle: str = ""
    company: str = ""
    portal: str = "other"


@router.post("/analyze")
async def analyze(body: AnalyzeRequest, uid: str = Depends(verify_token)):
    """Run 3-layer AI analysis pipeline (embeddings → ATS score → recommendations)."""
    try:
        from services.analysis_pipeline import analyze_resume_vs_jd
        result = await analyze_resume_vs_jd(
            user_id=uid,
            resume_id=body.resumeId,
            jd_text=body.jdText,
            jd_url=body.jdUrl,
            job_title=body.jobTitle,
            company=body.company,
            portal=body.portal,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
