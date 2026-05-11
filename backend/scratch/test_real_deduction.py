
import asyncio
import os
import sys
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from models.postgres_schema import UserCredit, User
from core.budget_guard import deduct_coins

async def test_real_deduction():
    uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2" # The user from the previous check
    
    async with async_session() as db:
        # Check initial balance
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit = result.scalar_one_or_none()
        if not credit:
            print("User credit not found")
            return
            
        initial_balance = credit.coins_balance
        print(f"Initial balance: {initial_balance}")
        
        # Deduct
        print("Deducting 12 coins for generate_interview_prep...")
        cost = await deduct_coins(db, uid, "generate_interview_prep")
        print(f"Deducted {cost} coins")
        
        # Check final balance in SAME session
        print(f"Balance in session after deduct: {credit.coins_balance}")
        
    # Check final balance in NEW session
    async with async_session() as db2:
        result = await db2.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit2 = result.scalar_one_or_none()
        print(f"Balance in new session: {credit2.coins_balance}")
        
        if credit2.coins_balance == initial_balance - cost:
            print("SUCCESS: Persistence confirmed")
        else:
            print("FAILURE: Persistence failed")

if __name__ == "__main__":
    asyncio.run(test_real_deduction())
