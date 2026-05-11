
import asyncio
import os
import sys
import uuid

# Add current directory and backend to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from core import budget_guard
from models.postgres_schema import User, UserCredit
from sqlalchemy import select

async def verify_batch():
    uid = "test-batch-" + str(uuid.uuid4())[:8]
    
    # 1. Create user with 35 coins
    async with async_session() as db:
        user = User(uid=uid, email=f"{uid}@example.com")
        db.add(user)
        credit = UserCredit(user_id=uid, coins_balance=35)
        db.add(credit)
        await db.commit()
    print(f"Created user {uid} with 35 coins")

    # 2. Try to deduct 41 coins (35 + 6)
    print("Attempting to deduct 41 coins (35 + 6)...")
    async with async_session() as db:
        try:
            await budget_guard.deduct_coins_batch(db, uid, ["parse_resume_pdf", "embed_resume"])
            print("SUCCESS (WAIT, THIS SHOULD HAVE FAILED!)")
        except Exception as e:
            print(f"EXPECTED FAILURE: {e}")
            await db.rollback() # Important: rollback if failed to release locks

    # 3. Check balance
    async with async_session() as db:
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        c = result.scalar_one()
        print(f"Balance in DB: {c.coins_balance}")

    # 4. Try with 100 coins and check if it deducts 41 or just 35
    async with async_session() as db:
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid).with_for_update())
        c = result.scalar_one()
        c.coins_balance = 100
        await db.commit()
    print("\nReset balance to 100 coins")
    
    async with async_session() as db:
        await budget_guard.deduct_coins_batch(db, uid, ["parse_resume_pdf", "embed_resume"])
        print("Deducted 41 coins")
    
    async with async_session() as db:
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        c = result.scalar_one()
        print(f"Balance after batch deduction: {c.coins_balance}")
        if c.coins_balance == 59:
            print("Correctly deducted 41 (100 - 35 - 6)")
        elif c.coins_balance == 65:
            print("INCORRECTly deducted only 35 (100 - 35)")
        else:
            print(f"Unexpected balance: {c.coins_balance}")

if __name__ == "__main__":
    asyncio.run(verify_batch())
