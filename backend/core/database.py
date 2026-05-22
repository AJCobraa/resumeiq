import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

POSTGRES_URL = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq")

# Fix Railway's URL format to use asyncpg driver
if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif POSTGRES_URL.startswith("postgresql://") and "+asyncpg" not in POSTGRES_URL:
    POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Only use SSL on Railway (not local)
APP_ENV = os.environ.get("APP_ENV", "dev")
connect_args = {"ssl": "require"} if APP_ENV != "dev" else {}

engine = create_async_engine(
    POSTGRES_URL,
    echo=False,
    connect_args=connect_args
)

async_session = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)

async def get_db_session():
    async with async_session() as session:
        yield session