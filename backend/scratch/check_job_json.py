
import asyncio
import os
import sys
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from models.postgres_schema import Job

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")

async def check_job_data(job_id: str):
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        res = await session.execute(select(Job).where(Job.job_id == job_id))
        row = res.scalar_one_or_none()
        if row:
            print(json.dumps(row.job_data, indent=2))
        else:
            print("Job not found")

    await engine.dispose()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(check_job_data(sys.argv[1]))
    else:
        print("Usage: python script.py <job_id>")
