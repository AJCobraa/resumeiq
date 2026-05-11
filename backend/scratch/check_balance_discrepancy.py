import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
import sys

# Add backend to path so we can import models
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from models.postgres_schema import CoinTransaction, UserCredit

# Use the same DB URL as the app
DATABASE_URL = os.environ.get("POSTGRES_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")

async def check_balances():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"

    async with async_session() as session:
        # 1. Get current balance
        stmt = select(UserCredit).where(UserCredit.user_id == uid)
        res = await session.execute(stmt)
        credit = res.scalar_one_or_none()
        balance = credit.coins_balance if credit else 0
        print(f"User: {uid}")
        print(f"Current coins_balance in user_credits: {balance}")

        # 2. Sum of all transactions
        stmt = select(func.sum(CoinTransaction.coins_charged)).where(CoinTransaction.user_id == uid)
        res = await session.execute(stmt)
        total_charged = res.scalar() or 0
        print(f"Total coins charged in coin_transactions: {total_charged}")
        
        # 3. List last 10 transactions
        print("\nLast 10 transactions:")
        stmt = select(CoinTransaction).where(CoinTransaction.user_id == uid).order_by(CoinTransaction.created_at.desc()).limit(10)
        res = await session.execute(stmt)
        txs = res.scalars().all()
        for tx in txs:
            print(f"  {tx.created_at} | {tx.operation} | {tx.coins_charged} coins")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_balances())
