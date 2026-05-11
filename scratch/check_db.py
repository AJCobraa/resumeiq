
import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Mocking the models since I can't easily import them without setting up the environment
# But I can try to use the existing ones if I set the python path correctly.

import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import POSTGRES_URL
from models.postgres_schema import User, UserCredit, Resume, CoinTransaction

async def check_db():
    engine = create_async_engine(POSTGRES_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    target_uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    async with async_session() as session:
        # Check credits for target user
        result = await session.execute(select(UserCredit).where(UserCredit.user_id == target_uid))
        credit = result.scalar_one_or_none()
        if credit:
            print(f"User {target_uid} Coins: {credit.coins_balance}")
        else:
            print(f"User {target_uid} has no credit record!")
            print(f"\nUser {target_uid} has no credit record.")

        # Check transactions
        res_tx = await session.execute(
            select(CoinTransaction)
            .where(CoinTransaction.user_id == target_uid)
            .order_by(CoinTransaction.created_at.desc())
        )
        txs = res_tx.scalars().all()
        print(f"Transactions for {target_uid}: {len(txs)}")
        for t in txs[:10]:
            print(f"  - {t.operation}: charged {t.coins_charged} at {t.created_at}")

        # Check resumes for this user
        res_resumes = await session.execute(
            select(Resume).where(Resume.user_id == target_uid)
        )
        user_resumes = res_resumes.scalars().all()
        print(f"Resumes for {target_uid}: {len(user_resumes)}")
        for r in user_resumes:
            print(f"  - {r.resume_id}: {r.resume_data.get('resumeTitle')}")

if __name__ == "__main__":
    asyncio.run(check_db())
