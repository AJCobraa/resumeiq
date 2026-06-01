"""
Study Center V2 Router — Skill Gaps and Roadmaps
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db_session
from core.model_registry import get_registry_for_frontend
from firebase_admin_init import verify_token
from modules.study_center import service
from modules.study_center.schemas import RoadmapGenerateRequest, NodeProgressRequest, RoadmapQuestionsRequest

router = APIRouter(prefix="/api", tags=["Roadmaps"])

@router.get("/study-models")
async def get_study_models(uid: str = Depends(verify_token)):
    """Returns available AI models and their coin costs."""
    # Use generate_roadmap as the baseline for costs in the UI
    return get_registry_for_frontend("generate_roadmap")


@router.post("/roadmaps/questions")
async def generate_roadmap_questions(body: RoadmapQuestionsRequest, uid: str = Depends(verify_token), db: AsyncSession = Depends(get_db_session)):
    return await service.generate_roadmap_questions(
        skill_name=body.skill_name,
        role_context=body.role_context,
        experience_level=body.experience_level
    )



@router.post("/roadmaps")
async def generate_roadmap(body: RoadmapGenerateRequest, uid: str = Depends(verify_token), db: AsyncSession = Depends(get_db_session)):
    return await service.generate_roadmap(
        db=db,
        uid=uid,
        skill_name=body.skill_name,
        model_key=body.model_key,
        roadmap_type=body.roadmap_type,
        experience_level=body.experience_level,
        source_job_id=body.source_job_id,
        source_gap_id=body.source_gap_id,
        role_context=body.role_context,
        gap_status=body.gap_status,
        answers=body.answers
    )


@router.get("/roadmaps")
async def list_roadmaps(uid: str = Depends(verify_token), db: AsyncSession = Depends(get_db_session)):
    from sqlalchemy import select
    from modules.study_center.models import Roadmap
    result = await db.execute(select(Roadmap).where(Roadmap.user_id == uid).order_by(Roadmap.last_accessed_at.desc()))
    roadmaps = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "skill_name": r.skill_name,
            "roadmap_type": r.roadmap_type,
            "experience_level": r.experience_level,
            "model_key": r.model_key,
            "coins_spent": r.coins_spent,
            "created_at": r.created_at,
            "last_accessed_at": r.last_accessed_at,
        }
        for r in roadmaps
    ]


@router.get("/roadmaps/{roadmap_id}")
async def get_roadmap(roadmap_id: str, uid: str = Depends(verify_token), db: AsyncSession = Depends(get_db_session)):
    return await service.get_roadmap_with_progress(db, uid, roadmap_id)


@router.patch("/roadmaps/{roadmap_id}/nodes/{node_id}")
async def update_node_progress(roadmap_id: str, node_id: str, body: NodeProgressRequest, uid: str = Depends(verify_token), db: AsyncSession = Depends(get_db_session)):
    return await service.upsert_node_progress(db, uid, roadmap_id, node_id, body.status)


@router.delete("/roadmaps/{roadmap_id}")
async def delete_roadmap(roadmap_id: str, uid: str = Depends(verify_token), db: AsyncSession = Depends(get_db_session)):
    from modules.study_center.models import Roadmap, RoadmapNodeProgress
    from sqlalchemy import select, delete
    
    result = await db.execute(select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == uid))
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
        
    await db.execute(delete(RoadmapNodeProgress).where(RoadmapNodeProgress.roadmap_id == roadmap_id))
    await db.delete(roadmap)
    await db.commit()
    return {"status": "success"}
