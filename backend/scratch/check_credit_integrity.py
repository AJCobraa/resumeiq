import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def check_db():
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        print("Checking for users without credits...")
        result = await conn.execute(text("""
            SELECT u.uid, u.email 
            FROM users u 
            LEFT JOIN user_credits c ON u.uid = c.user_id 
            WHERE c.user_id IS NULL
        """))
        missing = result.all()
        print(f"Users missing credit records: {missing}")
        
        print("\nChecking for users with 0 balance...")
        result = await conn.execute(text("SELECT user_id, coins_balance FROM user_credits WHERE coins_balance = 0"))
        zeros = result.all()
        print(f"Users with 0 balance: {zeros}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
