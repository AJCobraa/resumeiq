import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# In a real setup, this would be read from the environment
POSTGRES_URL = os.environ.get("POSTGRES_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")

# Fix Railway's URL format to use asyncpg driver
if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif POSTGRES_URL.startswith("postgresql://") and "+asyncpg" not in POSTGRES_URL:
    POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    POSTGRES_URL,
    echo=False,
    connect_args={"ssl": "require"}
)

async_session = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)

async def get_db_session():
    async with async_session() as session:
        yield session