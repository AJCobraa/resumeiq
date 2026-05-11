
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from core.database import async_session
from models.postgres_schema import Job
from services import gemma_service, resume_service
from sqlalchemy import select

async def simulate_prep(job_id):
    async with async_session() as db:
        uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
        
        result = await db.execute(
            select(Job).where(Job.job_id == job_id, Job.user_id == uid)
        )
        job_row = result.scalar_one_or_none()
        if not job_row:
            print("Job not found")
            return

        job_data = job_row.job_data or {}
        resume_id = job_data.get("resumeId")
        
        resume_data = await resume_service.get_resume(db, uid, resume_id)
        resume_summary = resume_service.summarize_resume(resume_data)
        missing_keywords = job_data.get("missingKeywords", [])
        job_title = job_data.get("jobTitle", "Target Role")
        company = job_data.get("company", "Tech Company")
        
        company_tier = gemma_service.classify_company_tier(company)
        
        print(f"Simulating prep for {company} ({company_tier['label']})")
        
        try:
            # We don't want to actually charge or log tokens if we can avoid it,
            # but we want to see the error.
            # Actually, let's just call it and see if it fails.
            prep_list = await gemma_service.generate_interview_prep(
                missing_keywords=missing_keywords,
                resume_summary=resume_summary,
                job_title=job_title,
                company=company,
                company_tier=company_tier,
                user_id=uid
            )
            print("Success!")
            print(prep_list)
        except Exception as e:
            print(f"Error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    job_id = "b2509c74-b18a-4a6a-88ad-a8ab697383c7"
    asyncio.run(simulate_prep(job_id))
