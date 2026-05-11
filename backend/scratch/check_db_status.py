import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def check_db():
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        print("Checking tables...")
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result.all()]
        print(f"Tables: {tables}")
        
        if 'user_credits' in tables:
            print("\nUser Credits sample:")
            result = await conn.execute(text("SELECT * FROM user_credits LIMIT 5"))
            print(result.all())
        else:
            print("\nWARNING: user_credits table MISSING!")
            
        if 'users' in tables:
            print("\nUsers count:")
            result = await conn.execute(text("SELECT count(*) FROM users"))
            print(result.scalar())
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
