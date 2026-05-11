
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from core import budget_guard
from models.postgres_schema import User, UserCredit, PlanType
from sqlalchemy import select, delete

async def repro():
    async with async_session() as db:
        # 1. Setup a test user with exactly 35 coins
        uid = "repro_user_123"
        
        # Clean up existing
        await db.execute(delete(UserCredit).where(UserCredit.user_id == uid))
        await db.execute(delete(User).where(User.uid == uid))
        await db.commit()
        
        user = User(uid=uid, email="repro@example.com", plan_type=PlanType.free)
        db.add(user)
        await db.flush()
        
        credit = UserCredit(user_id=uid, coins_balance=35)
        db.add(credit)
        await db.commit()
        
        print(f"Initial balance: {credit.coins_balance}")
        
        # 2. Try to deduct 41 coins (35 + 6)
        print("Attempting to deduct 41 coins (35 + 6) via deduct_coins_batch...")
        try:
            # We need a new session for the actual call if we want to simulate how it's used in the router
            async with async_session() as call_db:
                total_deducted = await budget_guard.deduct_coins_batch(call_db, uid, ["parse_resume_pdf", "embed_resume"])
                print(f"SUCCESS: Deducted {total_deducted} coins")
        except Exception as e:
            print(f"EXPECTED FAILURE: {e}")
            if hasattr(e, 'detail'):
                print(f"Detail: {e.detail}")

        # 3. Check final balance
        async with async_session() as check_db:
            result = await check_db.execute(select(UserCredit).where(UserCredit.user_id == uid))
            updated_credit = result.scalar_one()
            print(f"Final balance: {updated_credit.coins_balance}")
            
        # 4. Clean up
        async with async_session() as cleanup_db:
            await cleanup_db.execute(delete(UserCredit).where(UserCredit.user_id == uid))
            await cleanup_db.execute(delete(User).where(User.uid == uid))
            await cleanup_db.commit()

if __name__ == "__main__":
    asyncio.run(repro())
