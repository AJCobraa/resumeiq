
import asyncio
import os
import sys
from sqlalchemy import select

# Set up path to import backend modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import async_session
from models.postgres_schema import User, UserCredit, Resume, CoinTransaction
from core import budget_guard
from services import resume_service

async def repro():
    uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    
    async with async_session() as db:
        # 1. Check initial balance
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit = result.scalar_one_or_none()
        initial_balance = credit.coins_balance
        print(f"Initial Balance: {initial_balance}")
        
        # 2. Simulate deduct_coins
        print("Deducting 35 coins for parse_resume_pdf...")
        await budget_guard.deduct_coins(db, uid, "parse_resume_pdf")
        
        # 3. Check balance after deduction in a NEW session
        async with async_session() as db2:
            result2 = await db2.execute(select(UserCredit).where(UserCredit.user_id == uid))
            credit2 = result2.scalar_one_or_none()
            print(f"Balance after deduction (new session): {credit2.coins_balance}")
            
            if credit2.coins_balance == initial_balance:
                print("FAILURE: Coins were not deducted in the DB!")
            else:
                print("SUCCESS: Coins were deducted.")

        # 4. Simulate create_resume_from_parsed
        print("Creating mock resume...")
        mock_parsed = {
            "meta": {"name": "Test User"},
            "sections": []
        }
        resume = await resume_service.create_resume_from_parsed(db, uid, mock_parsed, title="Repro Test")
        print(f"Resume created with ID: {resume['resumeId']}")
        
        # 5. Check if resume exists in a NEW session
        async with async_session() as db3:
            result3 = await db3.execute(select(Resume).where(Resume.resume_id == resume['resumeId']))
            resume_row = result3.scalar_one_or_none()
            if resume_row:
                print("SUCCESS: Resume persisted in DB.")
            else:
                print("FAILURE: Resume NOT persisted in DB!")

if __name__ == "__main__":
    asyncio.run(repro())
