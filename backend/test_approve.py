import asyncio
from dotenv import load_dotenv
load_dotenv()
from core.database import async_session
from models.postgres_schema import Job
from sqlalchemy import select
from routers.jobs import update_recommendation, UpdateRecommendationRequest
from fastapi import BackgroundTasks

async def main():
    async with async_session() as db:
        res = await db.execute(select(Job).limit(1))
        job = res.scalar_one_or_none()
        if not job:
            print('No jobs')
            return
            
        recs = job.job_data.get('recommendations')
        if not recs:
            print('No recs')
            return
            
        rec_id = recs[0].get('recommendationId')
        print(f"Testing approve for job {job.job_id}, rec {rec_id}")
        
        req = UpdateRecommendationRequest(recommendationId=rec_id, action="approve")
        bg = BackgroundTasks()
        
        try:
            res = await update_recommendation(job.job_id, req, bg, uid=job.user_id, db=db)
            print("Success:", res)
        except Exception as e:
            print("Error:", str(e))

asyncio.run(main())
