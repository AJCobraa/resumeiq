
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from models.postgres_schema import CoinTransaction, UserCredit
from sqlalchemy import select

async def check_data():
    async with async_session() as db:
        # Get the latest user or a specific one if known
        # For this test, let's just look at all transactions
        result = await db.execute(select(CoinTransaction).order_by(CoinTransaction.created_at.desc()).limit(10))
        txs = result.scalars().all()
        
        print("Latest Transactions:")
        for tx in txs:
            print(f"User: {tx.user_id}, Op: {tx.operation}, Charged: {tx.coins_charged}, At: {tx.created_at}")
            
        result = await db.execute(select(UserCredit))
        credits = result.scalars().all()
        print("\nUser Credits:")
        for c in credits:
            print(f"User: {c.user_id}, Balance: {c.coins_balance}")

if __name__ == "__main__":
    asyncio.run(check_data())
