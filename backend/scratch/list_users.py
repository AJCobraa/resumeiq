
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), "backend")))

from core.database import async_session
from models.postgres_schema import User
from sqlalchemy import select

async def list_users():
    async with async_session() as db:
        result = await db.execute(select(User).limit(5))
        users = result.scalars().all()
        for u in users:
            print(f"User ID: {u.uid}, Email: {u.email}")

if __name__ == "__main__":
    asyncio.run(list_users())
