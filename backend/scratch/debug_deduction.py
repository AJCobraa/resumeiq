
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), "backend")))

from core.constants import FIXED_COST
from core.budget_guard import deduct_coins_batch
from core.database import async_session
from models.postgres_schema import UserCredit
from sqlalchemy import select, update

async def test_batch_deduction():
    print(f"FIXED_COST: {FIXED_COST}")
    ops = ["parse_resume_pdf", "embed_resume"]
    total = sum(FIXED_COST[op] for op in ops)
    print(f"Total for {ops}: {total}")

    # Use a real user ID
    test_uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    
    async with async_session() as db:
        # Ensure test user exists with 35 coins
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == test_uid))
        user = result.scalar_one_or_none()
        if not user:
            user = UserCredit(user_id=test_uid, coins_balance=35)
            db.add(user)
        else:
            user.coins_balance = 35
        await db.commit()
        
        print(f"User balance set to: {user.coins_balance}")
        
        try:
            print("Attempting to deduct 41 coins (35 + 6)...")
            await deduct_coins_batch(db, test_uid, ops)
            print("SUCCESS (Wait, this should have failed!)")
        except Exception as e:
            print(f"FAILED as expected: {e}")

        # Check balance after failure
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == test_uid))
        user = result.scalar_one_or_none()
        print(f"Final balance: {user.coins_balance}")

if __name__ == "__main__":
    asyncio.run(test_batch_deduction())
