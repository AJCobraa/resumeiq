
import asyncio
import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from sqlalchemy import select
from models.postgres_schema import Job
from services import gemma_service, resume_service

async def test_generation():
    uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    job_id = "b2509c74-b18a-4a6a-88ad-a8ab697383c7"
    
    async with async_session() as db:
        result = await db.execute(select(Job).where(Job.job_id == job_id, Job.user_id == uid))
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

        print(f"Generating interview prep for {company}...")
        try:
            prep_list = await gemma_service.generate_interview_prep(
                missing_keywords=missing_keywords,
                resume_summary=resume_summary,
                job_title=job_title,
                company=company,
                company_tier=company_tier,
                user_id=uid
            )
            print("Successfully generated interview prep!")
            print(json.dumps(prep_list[:1], indent=2))
        except Exception as e:
            print(f"Generation failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_generation())
