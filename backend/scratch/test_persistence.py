
import asyncio
import os
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from core.budget_guard import deduct_coins
from services import resume_service
from models.postgres_schema import User, UserCredit, Resume

async def test_import_flow():
    uid = "test-user-id"
    
    async with async_session() as db:
        # Ensure user and credit exists
        result = await db.execute(select(User).where(User.uid == uid))
        user = result.scalar_one_or_none()
        if not user:
            user = User(uid=uid, email="test@example.com")
            db.add(user)
            credit = UserCredit(user_id=uid, coins_balance=100)
            db.add(credit)
            await db.commit()
            print(f"Created test user {uid}")
        else:
            # Reset coins
            result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
            credit = result.scalar_one_or_none()
            credit.coins_balance = 100
            await db.commit()
            print(f"Reset coins for user {uid}")

        # Start the "import_pdf" flow simulation
        print("Starting coin deduction...")
        await deduct_coins(db, uid, "parse_resume_pdf")
        
        # Verify coins
        await db.refresh(credit)
        print(f"Coins after deduction: {credit.coins_balance}")

        # Simulate parsing results
        parsed_data = {
            "meta": {"name": "Test User"},
            "sections": [
                {"type": "experience", "company": "Test Co", "bullets": [{"text": "Did stuff"}]}
            ]
        }

        print("Saving resume...")
        resume_data = await resume_service.create_resume_from_parsed(db, uid, parsed_data, title="Test Resume")
        print(f"Resume saved with ID: {resume_data['resumeId']}")

        # Verify resume exists in DB
        result = await db.execute(select(Resume).where(Resume.resume_id == resume_data['resumeId']))
        row = result.scalar_one_or_none()
        if row:
            print("Successfully verified resume in DB!")
        else:
            print("ERROR: Resume NOT found in DB after commit!")

        # Final check of coins
        await db.refresh(credit)
        print(f"Final coin balance: {credit.coins_balance}")

if __name__ == "__main__":
    # Mock environment variables
    os.environ["POSTGRES_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq"
    asyncio.run(test_import_flow())
