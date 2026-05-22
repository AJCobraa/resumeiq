import asyncio
from core.database import async_session
from models.postgres_schema import User, Resume, Job
from sqlalchemy import select

async def main():
    async with async_session() as db:
        res_users = await db.execute(select(User))
        users = res_users.scalars().all()
        print(f"--- Users ({len(users)}) ---")
        for u in users:
            print(f"UID: {u.uid}, Email: {u.email}, Plan: {u.plan_type}")

        res_resumes = await db.execute(select(Resume))
        resumes = res_resumes.scalars().all()
        print(f"\n--- Resumes ({len(resumes)}) ---")
        for r in resumes:
            meta = r.resume_data.get('meta', {})
            title = meta.get('title') or meta.get('name') or "Untitled"
            print(f"ResumeID: {r.resume_id}, UserID: {r.user_id}, Title: {title}")

        res_jobs = await db.execute(select(Job))
        jobs = res_jobs.scalars().all()
        print(f"\n--- Jobs ({len(jobs)}) ---")
        for j in jobs:
            print(f"JobID: {j.job_id}, UserID: {j.user_id}, ResumeID: {j.resume_id}")

asyncio.run(main())
