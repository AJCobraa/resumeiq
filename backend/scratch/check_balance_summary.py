
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from core.database import async_session
from models.postgres_schema import UserCredit, CoinTransaction, Job
from sqlalchemy import select, func

async def check_balance(uid):
    async with async_session() as s:
        # Get balance
        cred_res = await s.execute(select(UserCredit).where(UserCredit.user_id == uid))
        cred = cred_res.scalar_one_or_none()
        balance = cred.coins_balance if cred else 0
        
        # Get all transactions
        tx_res = await s.execute(
            select(CoinTransaction)
            .where(CoinTransaction.user_id == uid)
            .order_by(CoinTransaction.created_at.asc())
        )
        txs = tx_res.scalars().all()
        
        total_charged = 0
        print(f"UID: {uid}")
        print(f"Current Balance: {balance}")
        print("\nTransaction History (Oldest First):")
        for tx in txs:
            total_charged += tx.coins_charged
            print(f"  {tx.created_at} | {tx.operation:25} | {tx.coins_charged:3} coins")
        
        print(f"\nTotal Charged: {total_charged}")
        print(f"Calculated Sum (Balance + Charged): {balance + total_charged}")

        # Get all jobs
        print("\nJobs and Interview Prep Status:")
        job_res = await s.execute(select(Job).where(Job.user_id == uid))
        jobs = job_res.scalars().all()
        for j in jobs:
            data = j.job_data or {}
            print(f"  {j.job_id} | {data.get('company', 'N/A'):20} | Prep: {bool(data.get('interviewPrep'))}")

if __name__ == "__main__":
    uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    asyncio.run(check_balance(uid))
