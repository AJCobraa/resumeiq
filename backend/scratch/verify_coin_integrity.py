
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from models.postgres_schema import UserCredit, CoinTransaction

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")

async def verify_integrity(user_id: str):
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get current balance
        res = await session.execute(select(UserCredit).where(UserCredit.user_id == user_id))
        credit = res.scalar_one_or_none()
        if not credit:
            print(f"User {user_id} not found.")
            return

        # Get total starting coins (if we track it? Usually not, but let's assume 250 initial)
        # Actually, let's just sum all transactions
        res = await session.execute(
            select(func.sum(CoinTransaction.coins_charged))
            .where(CoinTransaction.user_id == user_id)
        )
        total_spent = res.scalar() or 0

        print(f"User: {user_id}")
        print(f"Current Balance in DB: {credit.coins_balance}")
        print(f"Total Spent (from transactions): {total_spent}")
        print(f"Inferred Starting Coins (Balance + Spent): {credit.coins_balance + total_spent}")

        # Let's see the last 20 transactions
        res = await session.execute(
            select(CoinTransaction)
            .where(CoinTransaction.user_id == user_id)
            .order_by(CoinTransaction.created_at.desc())
            .limit(20)
        )
        transactions = res.scalars().all()
        print("\nLast 20 Transactions:")
        for t in transactions:
            print(f"- {t.created_at}: {t.operation} | Charged: {t.coins_charged}")

    await engine.dispose()

if __name__ == "__main__":
    uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    asyncio.run(verify_integrity(uid))
