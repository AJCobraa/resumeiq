
import asyncio
import os
import uuid
from sqlalchemy import select, delete
from core.database import async_session, engine
from models.postgres_schema import UserCredit, CoinTransaction
from core import budget_guard
from core.constants import FIXED_COST

async def setup_test_user(user_id: str, balance: int):
    async with async_session() as db:
        async with db.begin():
            # Clean up old transactions
            await db.execute(delete(CoinTransaction).where(CoinTransaction.user_id == user_id))
            # Set balance
            res = await db.execute(select(UserCredit).where(UserCredit.user_id == user_id))
            user_credit = res.scalar_one_or_none()
            if not user_credit:
                db.add(UserCredit(user_id=user_id, coins_balance=balance))
            else:
                user_credit.coins_balance = balance

async def repro():
    user_id = "test_user_repro"
    initial_balance = 35
    print(f"Setting up user {user_id} with {initial_balance} coins...")
    await setup_test_user(user_id, initial_balance)

    async with async_session() as db:
        print("\nAttempting batch deduction for ['parse_resume_pdf', 'embed_resume'] (Cost: 41)...")
        try:
            total_cost = await budget_guard.deduct_coins_batch(db, user_id, ["parse_resume_pdf", "embed_resume"])
            print(f"SUCCESS! Deducted {total_cost} coins. This is the BUG if balance was 35.")
        except Exception as e:
            print(f"EXPECTED FAILURE: {e}")

        # Check final balance
        res = await db.execute(select(UserCredit).where(UserCredit.user_id == user_id))
        user_credit = res.scalar_one_or_none()
        print(f"\nFinal Balance in DB: {user_credit.coins_balance}")

        # Check transactions
        res = await db.execute(select(CoinTransaction).where(CoinTransaction.user_id == user_id))
        txs = res.scalars().all()
        print(f"Transactions logged: {len(txs)}")
        for tx in txs:
            print(f" - {tx.operation}: {tx.coins_charged} coins")

if __name__ == "__main__":
    os.environ["POSTGRES_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq"
    asyncio.run(repro())
