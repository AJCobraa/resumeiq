
import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from core import budget_guard
from models.postgres_schema import User, UserCredit, PlanType, CoinTransaction
from sqlalchemy import select, delete

async def simulate_import_flow():
    uid = "sim_user_456"
    print(f"--- Simulating Import Flow for user {uid} ---")
    
    async with async_session() as setup_db:
        # Clean up
        await setup_db.execute(delete(UserCredit).where(UserCredit.user_id == uid))
        await setup_db.execute(delete(User).where(User.uid == uid))
        await setup_db.execute(delete(CoinTransaction).where(CoinTransaction.user_id == uid))
        await setup_db.commit()
        
        # Setup user with 35 coins
        user = User(uid=uid, email="sim@example.com", plan_type=PlanType.free)
        setup_db.add(user)
        await setup_db.flush()
        
        credit = UserCredit(user_id=uid, coins_balance=35)
        setup_db.add(credit)
        await setup_db.commit()
        
    print(f"Initial balance in DB: 35")

    # Step 1: Call deduct_coins_batch as in resumes.py
    print("\n[Step 1] Calling deduct_coins_batch(db, uid, ['parse_resume_pdf', 'embed_resume'])...")
    try:
        async with async_session() as db:
            await budget_guard.deduct_coins_batch(db, uid, ["parse_resume_pdf", "embed_resume"])
            print("SUCCESS: deduct_coins_batch passed (THIS SHOULD NOT HAPPEN IF BALANCE IS 35)")
    except Exception as e:
        print(f"BLOCKED: {e}")
        if hasattr(e, 'detail'): print(f"Detail: {e.detail}")

    # Step 2: Check balance
    async with async_session() as db:
        res = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        c = res.scalar_one()
        print(f"\nBalance after Step 1: {c.coins_balance}")

    # Now let's try with 45 coins
    print("\n--- Resetting to 45 coins ---")
    async with async_session() as db:
        res = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        c = res.scalar_one()
        c.coins_balance = 45
        await db.commit()

    print("\n[Step 2] Calling deduct_coins_batch(db, uid, ['parse_resume_pdf', 'embed_resume']) with 45 coins...")
    async with async_session() as db:
        await budget_guard.deduct_coins_batch(db, uid, ["parse_resume_pdf", "embed_resume"])
        print("SUCCESS: 41 coins deducted.")

    # Step 3: Check balance and transactions
    async with async_session() as db:
        res = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        c = res.scalar_one()
        print(f"Final balance in DB: {c.coins_balance} (Expected: 4)")
        
        res = await db.execute(select(CoinTransaction).where(CoinTransaction.user_id == uid))
        txs = res.scalars().all()
        print(f"Total transactions in coin_transactions: {len(txs)} (Wait, deduct_coins_batch DOES NOT LOG)")

    # Clean up
    async with async_session() as db:
        await db.execute(delete(UserCredit).where(UserCredit.user_id == uid))
        await db.execute(delete(User).where(User.uid == uid))
        await db.commit()

if __name__ == "__main__":
    asyncio.run(simulate_import_flow())
