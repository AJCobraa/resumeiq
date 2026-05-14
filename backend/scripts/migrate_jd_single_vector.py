import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import engine
from sqlalchemy import text

async def migrate():
    print("Starting migration: Refactor JD to single vector...")
    
    async with engine.begin() as conn:
        # 1. Add jd_embedding column to jobs
        print("Adding 'jd_embedding' column to 'jobs' table...")
        try:
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jd_embedding vector(3072);"))
            print("Successfully added 'jd_embedding' column.")
        except Exception as e:
            print(f"Note: Could not add column (it might already exist): {e}")

        # 2. Drop jd_embeddings table
        print("Dropping 'jd_embeddings' table...")
        try:
            await conn.execute(text("DROP TABLE IF EXISTS jd_embeddings CASCADE;"))
            print("Successfully dropped 'jd_embeddings' table.")
        except Exception as e:
            print(f"Error dropping table: {e}")

    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
