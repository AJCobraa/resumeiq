import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from core.database import async_session
from models.postgres_schema import Job, Resume
from sqlalchemy import select
from routers.jobs import update_recommendation, UpdateRecommendationRequest
from fastapi import BackgroundTasks
import json

async def test_rec(job_id, rec_id, uid):
    async with async_session() as db:
        req = UpdateRecommendationRequest(recommendationId=rec_id, action="approve")
        bg = BackgroundTasks()
        print(f"\n--- Testing approve for rec {rec_id} ---")
        
        # Get resume state before
        res_job = await db.execute(select(Job).where(Job.job_id == job_id))
        job_row = res_job.scalar_one()
        resume_id = job_row.resume_id
        
        res_resume = await db.execute(select(Resume).where(Resume.resume_id == resume_id))
        resume_row = res_resume.scalar_one()
        print(f"Resume {resume_id} BEFORE update:")
        # Print relevant parts
        # (Too much to print all, just look for change)
        
        res = await update_recommendation(job_id, req, bg, uid=uid, db=db)
        print("Update Recommendation Response Status:", res.get("status"))
        
        # Manually run background tasks
        for task in bg.tasks:
            await task.func(*task.args, **task.kwargs)
            
        # Refresh resume
        await db.commit() # Ensure background task commit is visible
        
        async with async_session() as db2:
            res_resume2 = await db2.execute(select(Resume).where(Resume.resume_id == resume_id))
            resume_row2 = res_resume2.scalar_one()
            print(f"Resume {resume_id} AFTER update.")
            # Compare or just trust if we see success logs
            
async def main():
    job_id = "e9cefd65-3ea0-4fa9-871f-70eb246e7297"
    uid = "test-user-id"
    recs = [
        "ef7dc2ae-e404-4895-b718-b274a46c8138", # summary
        "32d6449d-f94d-41ae-add0-ccfbe34a834e", # experience
        "ae580e4d-eb51-4628-b806-726caf90b882"  # skills
    ]
    
    for r_id in recs:
        await test_rec(job_id, r_id, uid)

if __name__ == "__main__":
    os.environ["POSTGRES_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq"
    asyncio.run(main())
