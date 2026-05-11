
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from sqlalchemy import select
from models.postgres_schema import Resume

async def check_resume():
    resume_id = "c392c810-8ec8-4f1c-a3f1-273342c5df39"
    async with async_session() as db:
        result = await db.execute(
            select(Resume).where(Resume.resume_id == resume_id)
        )
        res = result.scalar_one_or_none()
        if res:
            print(f"Resume {resume_id} Data:")
            print(res.resume_data)
        else:
            print(f"Resume {resume_id} not found.")

if __name__ == "__main__":
    asyncio.run(check_resume())
