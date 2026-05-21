
import asyncio
import uuid
import sys
import os

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.getcwd(), "backend", ".env"))

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from sqlalchemy.ext.asyncio import AsyncSession
from core.database import async_session
from models.postgres_schema import User, UserCredit
from routers.resumes import import_pdf

async def reproduce():
    user_id = "test_user_" + str(uuid.uuid4())[:8]
    
    async with async_session() as db:
        # 1. Create test user and credits
        user = User(uid=user_id, email=f"{user_id}@example.com")
        db.add(user)
        credits = UserCredit(user_id=user_id, coins_balance=1000)
        db.add(credits)
        await db.commit()
        print(f"Created user {user_id} with 1000 coins")

        # 2. Deduct coins (simulating import_pdf)
        print("Deducting coins...")
        cost = await budget_guard.deduct_coins(db, user_id, "parse_resume_pdf")
        print(f"Deducted {cost} coins")
        
        # Check balance
        result = await db.get(UserCredit, user_id)
        print(f"Balance after deduction: {result.coins_balance}")

        # 3. Simulate AI delay
        print("Simulating AI delay...")
        await asyncio.sleep(1)

        # 4. Save resume
        print("Saving resume...")
        parsed = {
            "meta": {"name": "Test User"},
            "sections": []
        }
        resume = await resume_service.create_resume_from_parsed(db, user_id, parsed, title="Test Resume")
        print(f"Saved resume {resume['resumeId']}")

        # 5. Check if it persists
        await db.close() # Close session
        
    async with async_session() as db:
        resumes = await resume_service.list_resumes(db, user_id)
        print(f"Found {len(resumes)} resumes for user")
        
        credits = await db.get(UserCredit, user_id)
        print(f"Final balance: {credits.coins_balance}")

if __name__ == "__main__":
    asyncio.run(reproduce())
