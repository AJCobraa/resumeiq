import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models.postgres_schema import User, UserCredit

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")

async def main():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Total Users: {len(users)}")
        
        for user in users:
            credit_result = await session.execute(select(UserCredit).where(UserCredit.user_id == user.uid))
            credit = credit_result.scalar_one_or_none()
            balance = credit.coins_balance if credit else "MISSING"
            print(f"UID: {user.uid} | Email: {user.email} | Credits: {balance}")

if __name__ == "__main__":
    asyncio.run(main())
