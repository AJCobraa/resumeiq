
import asyncio
import uuid
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from models.postgres_schema import User, UserCredit, Resume
from services import resume_service
from core import budget_guard
from sqlalchemy import select

async def test_full_import_flow():
    uid = f"test-user-{uuid.uuid4().hex[:8]}"
    print(f"Testing with UID: {uid}")
    
    async with async_session() as db:
        # 1. Create user and credits
        user = User(uid=uid, email=f"{uid}@example.com")
        credits = UserCredit(user_id=uid, coins_balance=100)
        db.add(user)
        db.add(credits)
        await db.commit()
        print(f"Created user and gave 100 coins.")

        # 2. Deduct coins
        print(f"Deducting coins for parse_resume_pdf...")
        await budget_guard.deduct_coins(db, uid, "parse_resume_pdf")
        
        # Verify balance
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        balance = result.scalar_one().coins_balance
        print(f"Balance after deduction: {balance}")
        if balance != 65:
            print(f"ERROR: Expected 65 coins, got {balance}")
        else:
            print("Coin deduction verified.")

        # 3. Create resume from parsed
        parsed = {
            "meta": {"name": "Test User", "email": "test@test.com"},
            "sections": [
                {"type": "experience", "company": "Test Co", "role": "Dev", "bullets": [{"text": "Did stuff"}]}
            ]
        }
        print("Creating resume from parsed data...")
        resume = await resume_service.create_resume_from_parsed(db, uid, parsed, title="Test Import")
        resume_id = resume["resumeId"]
        print(f"Resume created with ID: {resume_id}")

        # 4. Verify persistence
        print("Verifying persistence in new session...")
        
    # Start a fresh session to verify persistence
    async with async_session() as db2:
        resumes = await resume_service.list_resumes(db2, uid)
        print(f"Found {len(resumes)} resumes for user.")
        if len(resumes) == 1 and resumes[0]["resumeId"] == resume_id:
            print("Persistence verified.")
        else:
            print(f"ERROR: Resume not found in list. Found: {resumes}")
            
        # Check if it exists in the raw table
        result = await db2.execute(select(Resume).where(Resume.resume_id == resume_id))
        row = result.scalar_one_or_none()
        if row:
            print(f"Confirmed row exists in DB table: {row.resume_id}")
        else:
            print("ERROR: Row missing from DB table!")

if __name__ == "__main__":
    os.environ["POSTGRES_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq"
    asyncio.run(test_full_import_flow())
