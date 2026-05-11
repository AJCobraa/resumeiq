import asyncio
import json
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd())))

from core.database import async_session
from sqlalchemy import select
from models.postgres_schema import Job

async def check_job(job_id):
    async with async_session() as db:
        res = await db.execute(select(Job).where(Job.job_id == job_id))
        job = res.scalar_one_or_none()
        if job:
            data = dict(job.job_data)
            # Remove huge embeddings for display
            if "embeddings" in data:
                del data["embeddings"]
            print(json.dumps(data, indent=2))
        else:
            print(f"Job {job_id} not found")

if __name__ == "__main__":
    job_id = "b2509c74-b18a-4a6a-88ad-a8ab697383c7"
    asyncio.run(check_job(job_id))
