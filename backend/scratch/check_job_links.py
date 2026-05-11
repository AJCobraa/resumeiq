
import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import async_session
from models.postgres_schema import Job
from sqlalchemy import select

async def check():
    async with async_session() as db:
        res = await db.execute(select(Job).limit(10))
        rows = res.scalars().all()
        for r in rows:
            print(f"Job: {r.job_id}")
            print(f"  Column resume_id: {r.resume_id}")
            print(f"  JSONB resumeId:   {r.job_data.get('resumeId')}")

if __name__ == "__main__":
    asyncio.run(check())
