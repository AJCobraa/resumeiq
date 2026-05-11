
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd()))

from core.database import async_session, engine
from models.postgres_schema import User, UserCredit, CoinTransaction, Base
from core.constants import FIXED_COST
from core import budget_guard
from sqlalchemy import select, delete

async def setup_test_user(uid, balance):
    async with async_session() as session:
        # Clean up
        await session.execute(delete(CoinTransaction).where(CoinTransaction.user_id == uid))
        await session.execute(delete(UserCredit).where(UserCredit.user_id == uid))
        await session.execute(delete(User).where(User.uid == uid))
        await session.commit()

        # Create user
        user = User(uid=uid, email=f"{uid}@example.com")
        session.add(user)
        await session.flush()
        
        credit = UserCredit(user_id=uid, coins_balance=balance)
        session.add(credit)
        await session.commit()
        print(f"Setup user {uid} with balance {balance}")

async def run_import_simulation(uid, balance):
    print(f"\n--- Simulating Import for user {uid} (Balance: {balance}) ---")
    await setup_test_user(uid, balance)
    
    async with async_session() as session:
        try:
            ops = ["parse_resume_pdf", "embed_resume"]
            total_needed = sum(FIXED_COST[op] for op in ops)
            print(f"Ops: {ops}, Total needed: {total_needed}")
            
            # This is what import_pdf does
            await budget_guard.deduct_coins_batch(session, uid, ops)
            print("Deduction successful!")
            
        except Exception as e:
            print(f"Deduction failed as expected: {e}")

    # Check final state
    async with async_session() as session:
        res = await session.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit = res.scalar_one()
        print(f"Final Balance: {credit.coins_balance}")
        
        res = await session.execute(select(CoinTransaction).where(CoinTransaction.user_id == uid))
        txs = res.scalars().all()
        print(f"Transactions in table: {len(txs)}")
        for tx in txs:
            print(f"  - {tx.operation}: {tx.coins_charged} coins")

async def main():
    # Test case 1: Exactly 35 coins (Should fail for 41)
    await run_import_simulation("test_35", 35)
    
    # Test case 2: 100 coins (Should deduct 41)
    await run_import_simulation("test_100", 100)

if __name__ == "__main__":
    asyncio.run(main())
