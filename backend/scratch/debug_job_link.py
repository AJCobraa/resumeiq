
import asyncio
import sys
import os

# Add backend to sys.path so we can import from core, models, etc.
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import async_session
from models.postgres_schema import Job, Resume
from sqlalchemy import select

async def check():
    job_id = "b2509c74-b18a-4a6a-88ad-a8ab697383c7"
    async with async_session() as db:
        result = await db.execute(select(Job).where(Job.job_id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            print(f"Job {job_id} not found")
            return
        
        print(f"Job found: {job.job_id}")
        print(f"Job.user_id: {job.user_id}")
        resume_id_col = job.resume_id
        job_data_resume_id = job.job_data.get("resumeId")
        print(f"Job.resume_id (column): {resume_id_col}")
        print(f"job_data['resumeId'] (JSONB): {job_data_resume_id}")

        rid_to_check = job_data_resume_id or resume_id_col
        if rid_to_check:
            res_result = await db.execute(select(Resume).where(Resume.resume_id == rid_to_check))
            resume = res_result.scalar_one_or_none()
            if resume:
                print(f"Resume {rid_to_check} found")
            else:
                print(f"Resume {rid_to_check} NOT found")
        else:
            print("No resume ID found in job record")

if __name__ == "__main__":
    asyncio.run(check())
