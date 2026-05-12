import asyncio
from core.database import async_session
from models.postgres_schema import Job
from sqlalchemy import select

async def main():
    async with async_session() as db:
        res = await db.execute(select(Job).limit(1))
        job = res.scalar_one_or_none()
        if job:
            recs = job.job_data.get('recommendations')
            if recs:
                print(recs[0].keys())
            else:
                print('No recs')
        else:
            print('No jobs')

asyncio.run(main())
