import asyncio
import os
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from models.postgres_schema import Resume
from services import resume_service

# Setup DB connection
DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq"
engine = create_async_engine(DB_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def test_auto_branching():
    print("Testing Auto-Branching...")
    async with async_session() as db:
        # 1. Run migration
        print("Applying migration...")
        await db.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_base BOOLEAN DEFAULT TRUE NOT NULL;"))
        await db.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS source_resume_id VARCHAR;"))
        await db.commit()

        # 2. Create a base resume
        uid = "test-user-id"
        print("Creating base resume...")
        base_resume = await resume_service.create_resume(db, uid, "My Master Resume", "cobra")
        base_id = base_resume["resumeId"]
        
        # Verify it's a base resume
        row = await resume_service._get_resume_row(db, uid, base_id)
        assert row.is_base is True
        assert base_resume.get("isBase") is True
        print(f"Base resume created successfully. ID: {base_id}, is_base: {row.is_base}")

        # 3. Duplicate it for tailoring
        print("Duplicating for tailoring...")
        tailored_resume = await resume_service.duplicate_resume_for_tailoring(
            db, uid, base_id, "TechCorp - My Master Resume"
        )
        tailored_id = tailored_resume["resumeId"]
        
        # Verify clone logic
        assert tailored_id != base_id
        assert tailored_resume.get("isBase") is False
        assert tailored_resume["resumeTitle"] == "TechCorp - My Master Resume"
        
        tailored_row = await resume_service._get_resume_row(db, uid, tailored_id)
        assert tailored_row.is_base is False
        assert tailored_row.source_resume_id == base_id
        
        print(f"Tailored resume cloned successfully. ID: {tailored_id}, is_base: {tailored_row.is_base}, source: {tailored_row.source_resume_id}")

        # 4. Toggle base status
        print("Toggling base status on tailored clone to True...")
        await resume_service.toggle_base_status(db, uid, tailored_id, True)
        
        toggled_row = await resume_service._get_resume_row(db, uid, tailored_id)
        assert toggled_row.is_base is True
        print(f"Status toggled successfully. is_base: {toggled_row.is_base}")

        print("✅ All backend auto-branching logic works perfectly!")

if __name__ == "__main__":
    import sys
    # Add current dir to path to import correctly
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
    os.environ["POSTGRES_URL"] = DB_URL
    asyncio.run(test_auto_branching())
