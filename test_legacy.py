import asyncio
import os
import uuid
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from backend.models.postgres_schema import Resume
from backend.services import resume_service
from backend.routers.jobs import update_recommendation
from backend.routers.jobs import UpdateRecommendationRequest
from fastapi import BackgroundTasks

DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq"
engine = create_async_engine(DB_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def test_legacy_resume():
    uid = "legacy-user"
    legacy_resume_id = str(uuid.uuid4())
    
    async with async_session() as db:
        # Create legacy resume (no isBase in JSONB)
        data = {
            "resumeId": legacy_resume_id,
            "resumeTitle": "Old Resume",
            "meta": {"title": "SWE"},
            "sections": []
        }
        row = Resume(
            resume_id=legacy_resume_id,
            user_id=uid,
            resume_data=data,
            is_base=True, # The column default
            source_resume_id=None
        )
        db.add(row)
        await db.commit()
        
        # Test get_resume hydration
        fetched = await resume_service.get_resume(db, uid, legacy_resume_id)
        assert fetched["isBase"] is True, "get_resume did not hydrate isBase!"
        print("Legacy resume properly hydrated!")
        
if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
    os.environ["POSTGRES_URL"] = DB_URL
    asyncio.run(test_legacy_resume())
