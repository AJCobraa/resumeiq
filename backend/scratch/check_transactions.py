
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from sqlalchemy import select
from models.postgres_schema import CoinTransaction

async def check_transactions():
    user_id = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    async with async_session() as db:
        result = await db.execute(
            select(CoinTransaction).where(CoinTransaction.user_id == user_id).order_by(CoinTransaction.created_at.desc())
        )
        txs = result.scalars().all()
        print(f"Transactions for {user_id}:")
        for tx in txs:
            print(f"[{tx.created_at}] {tx.operation} | Charged: {tx.coins_charged}")

if __name__ == "__main__":
    asyncio.run(check_transactions())
