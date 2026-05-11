
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from sqlalchemy import select
from models.postgres_schema import Job

async def list_jobs():
    async with async_session() as db:
        uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
        result = await db.execute(select(Job).where(Job.user_id == uid))
        jobs = result.scalars().all()
        for j in jobs:
            print(f"JobID: {j.job_id} | Title: {j.job_data.get('jobTitle')}")

if __name__ == "__main__":
    asyncio.run(list_jobs())
