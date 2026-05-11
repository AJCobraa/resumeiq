
import asyncio
import os
import sys
import uuid

# Add current directory to path
sys.path.append(os.getcwd())

from core.database import async_session
from core import budget_guard
from services import resume_service
from models.postgres_schema import User, UserCredit
from sqlalchemy import select

async def simulate_import():
    uid = "test-user-" + str(uuid.uuid4())[:8]
    async with async_session() as db:
        # 1. Create user
        user = User(uid=uid, email=f"{uid}@example.com")
        db.add(user)
        credit = UserCredit(user_id=uid, coins_balance=100)
        db.add(credit)
        await db.commit()
        print(f"Created user {uid} with 100 coins")

        # 2. Deduct coins
        await budget_guard.deduct_coins(db, uid, "parse_resume_pdf")
        print("Deducted coins")

        # 3. Check balance immediately
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        c = result.scalar_one()
        print(f"Balance after deduction: {c.coins_balance}")

        # 4. Create resume
        parsed = {
            "meta": {"name": "Test User"},
            "sections": []
        }
        resume = await resume_service.create_resume_from_parsed(db, uid, parsed, title="Test Import")
        print(f"Created resume {resume['resumeId']}")

        # 5. Check resume in DB
        from models.postgres_schema import Resume
        result = await db.execute(select(Resume).where(Resume.resume_id == resume['resumeId']))
        r = result.scalar_one_or_none()
        if r:
            print(f"Resume found in DB: {r.resume_id}")
        else:
            print("Resume NOT found in DB!")

if __name__ == "__main__":
    asyncio.run(simulate_import())
