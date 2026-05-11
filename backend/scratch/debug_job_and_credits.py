
import asyncio
import os
import sys
import json

# Add current directory to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import async_session
from models.postgres_schema import Resume, UserCredit, User, Job, CoinTransaction
from sqlalchemy import select, func

async def check(uid, job_id):
    async with async_session() as s:
        print(f"--- User Credit ---")
        cred_res = await s.execute(select(UserCredit).where(UserCredit.user_id == uid))
        cred = cred_res.scalar_one_or_none()
        if cred:
            print(f"User: {uid}")
            print(f"Balance: {cred.coins_balance}")
        else:
            print(f"UserCredit not found for {uid}")

        print(f"\n--- Job Details ---")
        job_res = await s.execute(select(Job).where(Job.job_id == job_id))
        job = job_res.scalar_one_or_none()
        if job:
            print(f"Job ID: {job.job_id}")
            print(f"User ID: {job.user_id}")
            print(f"Resume ID: {job.job_data.get('resumeId')}")
            print(f"Company: {job.job_data.get('company')}")
            print(f"Interview Prep present: {bool(job.job_data.get('interviewPrep'))}")
            print(f"Interview Prep Generated At: {job.job_data.get('interviewPrepGeneratedAt')}")
            print(f"Interview Prep Resume ID: {job.job_data.get('interviewPrepResumeId')}")
            print(f"Job Data Keys: {list(job.job_data.keys())}")
        else:
            print(f"Job {job_id} not found")

        print(f"\n--- Transactions ---")
        tx_res = await s.execute(
            select(CoinTransaction)
            .where(CoinTransaction.user_id == uid)
            .order_by(CoinTransaction.created_at.desc())
            .limit(10)
        )
        txs = tx_res.scalars().all()
        for tx in txs:
            print(f"  {tx.created_at} | {tx.operation} | {tx.coins_charged} coins | In: {tx.input_tokens} | Out: {tx.output_tokens}")

if __name__ == "__main__":
    uid = sys.argv[1]
    job_id = sys.argv[2]
    asyncio.run(check(uid, job_id))
