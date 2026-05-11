
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from core.database import async_session
from models.postgres_schema import CoinTransaction
from sqlalchemy import select

async def check():
    async with async_session() as s:
        # Check transactions
        txs = await s.execute(select(CoinTransaction).order_by(CoinTransaction.created_at.desc()))
        txs_list = txs.scalars().all()
        print(f"Transactions: {len(txs_list)}")
        for tx in txs_list:
            print(f"  - {tx.created_at}: User: {tx.user_id}, Op: {tx.operation}, Coins: {tx.coins_charged}")

if __name__ == "__main__":
    asyncio.run(check())
