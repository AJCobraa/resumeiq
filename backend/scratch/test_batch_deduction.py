
import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from models.postgres_schema import Base, UserCredit
from core.budget_guard import deduct_coins_batch
from core.constants import FIXED_COST

async def test_deduct_batch():
    # Setup in-memory sqlite
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        # Create a user with 100 coins
        user_id = "test_user"
        credit = UserCredit(user_id=user_id, coins_balance=100)
        session.add(credit)
        await session.commit()
        
        # We need to get a fresh session because the commit above might have closed things or we need a new transaction
        async with async_session() as session2:
            print(f"Initial balance: 100")
            
            # Deduct batch
            ops = ["parse_resume_pdf", "embed_resume"]
            total = await deduct_coins_batch(session2, user_id, ops)
            print(f"Total deducted returned: {total}")
            
            # Check balance
            result = await session2.execute(select(UserCredit).where(UserCredit.user_id == user_id))
            credit2 = result.scalar_one()
            print(f"Balance after batch: {credit2.coins_balance}")
            
            # Test insufficient funds (64 - 105 < 0)
            try:
                await deduct_coins_batch(session2, user_id, ["parse_resume_pdf"] * 3) # 35 * 3 = 105
            except Exception as e:
                print(f"Caught expected error: {e.detail if hasattr(e, 'detail') else e}")

if __name__ == "__main__":
    asyncio.run(test_deduct_batch())
