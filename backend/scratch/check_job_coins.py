
import asyncio
import os
import sys
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from models.postgres_schema import UserCredit, CoinTransaction, Job

async def check_job_status(job_id):
    async with async_session() as db:
        # Find job
        result = await db.execute(select(Job).where(Job.job_id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            print(f"Job {job_id} not found")
            return
            
        uid = job.user_id
        print(f"User ID for job: {uid}")
        
        # Check credits
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit = result.scalar_one_or_none()
        balance = credit.coins_balance if credit else "N/A"
        print(f"Current balance for user {uid}: {balance}")
        
        # Check transactions
        result = await db.execute(
            select(CoinTransaction)
            .where(CoinTransaction.user_id == uid)
            .order_by(CoinTransaction.created_at.desc())
            .limit(10)
        )
        transactions = result.scalars().all()
        print(f"\nRecent transactions for user {uid}:")
        for t in transactions:
            print(f"- {t.created_at}: {t.operation} ({t.coins_charged} coins)")

if __name__ == "__main__":
    job_id = "b2509c74-b18a-4a6a-88ad-a8ab697383c7"
    asyncio.run(check_job_status(job_id))
