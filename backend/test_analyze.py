import asyncio
from dotenv import load_dotenv
load_dotenv()
from firebase_admin_init import db
from services.analysis_pipeline import analyze_resume_vs_jd

async def main():
    try:
        users = list(db.collection("users").limit(1).stream())
        if not users:
            print("No users found.")
            return
        user_id = users[0].id
        
        resumes = list(db.collection("users").document(user_id).collection("resumes").limit(1).stream())
        if not resumes:
            print("No resumes found.")
            return
        resume_id = resumes[0].id
        
        print(f"Testing with User: {user_id}, Resume: {resume_id}")
        
        res = await analyze_resume_vs_jd(
            user_id=user_id,
            resume_id=resume_id,
            jd_text="Software Engineer with Python and React skills. Need to build scaleable backend systems.",
            job_title="Software Engineer",
            company="Test Inc",
            portal="other"
        )
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
