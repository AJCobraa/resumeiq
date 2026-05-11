
import asyncio
import os
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from models.postgres_schema import UserCredit, CoinTransaction
from core.budget_guard import deduct_coins

async def test_deduction():
    uid = "test-user-uid" # Use a known UID if possible, or create one
    
    async with async_session() as db:
        # 1. Ensure user has credits
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit = result.scalar_one_or_none()
        if not credit:
            print(f"Creating user credit for {uid}")
            credit = UserCredit(user_id=uid, coins_balance=1000)
            db.add(credit)
            await db.commit()
        
        initial_balance = credit.coins_balance
        print(f"Initial balance: {initial_balance}")
        
        # 2. Call deduct_coins
        print("Calling deduct_coins for generate_interview_prep...")
        cost = await deduct_coins(db, uid, "generate_interview_prep")
        print(f"Deducted cost: {cost}")
        
        # 3. Verify balance
        await db.refresh(credit)
        final_balance = credit.coins_balance
        print(f"Final balance: {final_balance}")
        
        if final_balance == initial_balance - cost:
            print("SUCCESS: Balance correctly deduced.")
        else:
            print(f"FAILURE: Balance mismatch! Expected {initial_balance - cost}, got {final_balance}")

if __name__ == "__main__":
    asyncio.run(test_deduction())
