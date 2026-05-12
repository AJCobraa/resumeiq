import asyncio
import sys
import os

# Add parent dir to path to import core/models
sys.path.append(os.getcwd())

from core.database import async_session
from models.postgres_schema import Resume, ResumeEmbedding
from sqlalchemy import select, delete

async def cleanup():
    # THE CORRECT UID WITH A ZERO '0'
    target_uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    
    async with async_session() as db:
        # Find resumes for this user
        res = await db.execute(select(Resume).where(Resume.user_id == target_uid))
        resumes = res.scalars().all()
        
        if not resumes:
            print(f"No resumes found for user {target_uid}")
            return
            
        resume_ids = [r.resume_id for r in resumes]
        print(f"Found {len(resumes)} resume(s) for user {target_uid}: {resume_ids}")
        
        # 1. Delete child embeddings first
        emb_del = await db.execute(
            delete(ResumeEmbedding).where(ResumeEmbedding.resume_id.in_(resume_ids))
        )
        print(f"Deleted {emb_del.rowcount} embedding row(s).")
        
        # 2. Delete the resumes
        res_del = await db.execute(
            delete(Resume).where(Resume.resume_id.in_(resume_ids))
        )
        print(f"Deleted {res_del.rowcount} resume row(s).")
        
        await db.commit()
        print("Cleanup complete and committed.")

if __name__ == "__main__":
    asyncio.run(cleanup())
