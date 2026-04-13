import asyncio
import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.getcwd())
load_dotenv()

from services import resume_service
from services import pdf_service

async def test_pdf_export():
    try:
        from firebase_admin_init import db
        # collection_group("resumes") finds all resumes regardless of parent user document
        resumes_ref = db.collection_group("resumes").limit(1).get()
        
        if not resumes_ref:
            print("No resumes found in Firestore.")
            return

        doc = resumes_ref[0]
        resume_data = doc.to_dict()
        resume_id = doc.id
        path_parts = doc.reference.path.split('/')
        uid = path_parts[1]
        
        print(f"Testing PDF export for User: {uid}, Resume: {resume_id}")
        
        pdf_bytes = await pdf_service.export_resume_pdf(uid, resume_id, resume_data.get("templateId", "cobra"))
        
        output_path = "scratch/debug_export.pdf"
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)
        
        print(f"Successfully exported PDF to {output_path} ({len(pdf_bytes)} bytes)")

    except Exception as e:
        import traceback
        print(f"Export failed: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_pdf_export())
