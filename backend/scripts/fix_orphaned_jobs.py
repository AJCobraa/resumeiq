import asyncio
import sys
import os

# Add parent dir to path to import core/models
sys.path.append(os.getcwd())

from core.database import async_session
from models.postgres_schema import Resume, Job
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

async def fix_orphaned_jobs():
    target_uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    
    async with async_session() as db:
        # 1. Get all valid resume IDs for this user
        res = await db.execute(select(Resume.resume_id).where(Resume.user_id == target_uid))
        valid_resume_ids = set(res.scalars().all())
        print(f"Valid resume IDs for user {target_uid}: {valid_resume_ids}")
        
        # 2. Get all jobs for this user
        jobs_res = await db.execute(select(Job).where(Job.user_id == target_uid))
        jobs = jobs_res.scalars().all()
        
        fixed_count = 0
        for job in jobs:
            job_data = job.job_data or {}
            resume_id_in_job = job_data.get("resumeId")
            resume_title_in_job = job_data.get("resumeTitle")
            
            # If the job has a resumeId but it's not in the valid set, and it's not already marked __deleted__
            if resume_id_in_job and resume_id_in_job not in valid_resume_ids:
                if resume_title_in_job != "__deleted__":
                    print(f"Fixing job {job.job_id}: resume {resume_id_in_job} ('{resume_title_in_job}') is missing.")
                    job_data = dict(job_data)
                    job_data["resumeTitle"] = "__deleted__"
                    job.job_data = job_data
                    flag_modified(job, "job_data")
                    fixed_count += 1
                else:
                    print(f"Job {job.job_id} already marked __deleted__.")
            else:
                print(f"Job {job.job_id} is healthy (points to valid resume or has no resume).")
        
        if fixed_count > 0:
            await db.commit()
            print(f"Fixed {fixed_count} orphaned job references.")
        else:
            print("No orphaned job references found.")

if __name__ == "__main__":
    asyncio.run(fix_orphaned_jobs())
