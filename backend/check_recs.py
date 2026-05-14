import asyncio
from core.database import async_session
from models.postgres_schema import Job
from sqlalchemy import select

async def main():
    async with async_session() as db:
        res = await db.execute(select(Job).order_by(Job.created_at.desc()).limit(1))
        job = res.scalar_one_or_none()
        if job:
            print(f"JobID: {job.job_id}")
            print(f"UserID: {job.user_id}")
            print(f"ResumeID: {job.resume_id}")
            print(f"ATS Score: {job.job_data.get('atsScore')}")
            print(f"Semantic Score: {job.job_data.get('semanticScore')}")
            print(f"Recommendations count: {len(job.job_data.get('recommendations', []))}")
            print(f"JD URL: {job.job_data.get('jdUrl')}")
        else:
            print('No jobs found')

asyncio.run(main())
