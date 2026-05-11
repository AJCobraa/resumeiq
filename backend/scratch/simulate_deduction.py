
import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import async_session
from models.postgres_schema import UserCredit, CoinTransaction
from core import budget_guard
from sqlalchemy import select

async def simulate():
    uid = 'W5jcUTNnXCShUoMKQlmbaCj07YA2'
    async with async_session() as db:
        # First, give them some coins so we can test
        res = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit = res.scalar_one_or_none()
        print(f"Initial Balance: {credit.coins_balance}")
        
        credit.coins_balance += 100
        await db.commit()
        print(f"Balance after top-up: {credit.coins_balance}")
        
        # Now deduct for interview prep
        print("Deducting 12 coins for generate_interview_prep...")
        cost = await budget_guard.deduct_coins(db, uid, "generate_interview_prep")
        print(f"Deducted: {cost}")
        
        # Check balance again
        await db.refresh(credit)
        print(f"Balance after deduction: {credit.coins_balance}")
        
        if credit.coins_balance == 88: # 100 - 12 (assuming it was 0 before top-up)
             print("SUCCESS: Coin deduction persisted correctly.")
        else:
             print(f"FAILURE: Balance is {credit.coins_balance}, expected 88.")

if __name__ == "__main__":
    asyncio.run(simulate())
