import asyncio
from core.database import engine
from models.postgres_schema import Base
import modules.study_center.models

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_db())
    print("DB tables created successfully.")
