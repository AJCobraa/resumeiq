
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from core.database import async_session
from models.postgres_schema import Resume, UserCredit, User
from sqlalchemy import select

async def check():
    async with async_session() as s:
        # Check resumes
        resumes = await s.execute(select(Resume).order_by(Resume.created_at.desc()))
        resumes_list = resumes.scalars().all()
        print(f"Resumes: {len(resumes_list)}")
        for r in resumes_list:
            data = r.resume_data
            print(f"  - {r.resume_id}: Title: '{data.get('resumeTitle')}', User: {r.user_id}, CreatedAt: {r.created_at}")

if __name__ == "__main__":
    asyncio.run(check())
