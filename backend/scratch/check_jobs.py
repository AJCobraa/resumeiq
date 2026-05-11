
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from sqlalchemy import select
from models.postgres_schema import Job

async def list_jobs():
    user_id = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    async with async_session() as db:
        result = await db.execute(
            select(Job).where(Job.user_id == user_id)
        )
        jobs = result.scalars().all()
        print(f"Jobs for {user_id}:")
        for job in jobs:
            print(f"ID: {job.job_id} | ResumeID: {job.resume_id} | Keys: {list(job.job_data.keys())}")
            if "interviewPrep" in job.job_data:
                print(f"  -> Interview Prep: YES")
            else:
                print(f"  -> Interview Prep: NO")

if __name__ == "__main__":
    asyncio.run(list_jobs())
