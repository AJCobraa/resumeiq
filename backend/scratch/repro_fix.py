
import asyncio
import os
import uuid
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set env for local DB access
os.environ["POSTGRES_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/resumeiq"

from core.database import async_session
from core.budget_guard import deduct_coins_batch
from models.postgres_schema import User, UserCredit, CoinTransaction
from sqlalchemy import select, delete

async def repro():
    uid = f"test-user-{uuid.uuid4().hex[:8]}"
    print(f"Creating test user: {uid}")
    
    async with async_session() as db:
        # 1. Setup: Create user with 40 coins
        new_user = User(uid=uid, email=f"{uid}@example.com")
        db.add(new_user)
        db.add(UserCredit(user_id=uid, coins_balance=40))
        await db.commit()
        
        print(f"User created with 40 coins. Attempting batch deduction for 41 coins (35+6)...")
        
        # 2. Test: Attempt to deduct 41 coins (should fail)
        try:
            await deduct_coins_batch(db, uid, ["parse_resume_pdf", "embed_resume"])
            print("ERROR: Deduction succeeded but should have failed!")
        except Exception as e:
            print(f"Success: Deduction failed as expected: {e}")
            if getattr(e, 'status_code', None) != 402:
                print(f"Warning: Expected status_code 402, got {getattr(e, 'status_code', None)}")

        # 3. Setup: Give user 50 coins
        result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        user_credit = result.scalar_one()
        user_credit.coins_balance = 50
        await db.commit()
        print(f"User balance updated to 50 coins. Attempting batch deduction for 41 coins...")

        # 4. Test: Deduct 41 coins (should succeed)
        await deduct_coins_batch(db, uid, ["parse_resume_pdf", "embed_resume"])
        
        # 5. Verify: Balance should be 9
        await db.refresh(user_credit)
        print(f"New balance: {user_credit.coins_balance}")
        if user_credit.coins_balance == 9:
            print("Success: Balance is exactly 9 (50 - 41).")
        else:
            print(f"ERROR: Expected balance 9, got {user_credit.coins_balance}")

        # 6. Verify: Transaction logs
        result = await db.execute(select(CoinTransaction).where(CoinTransaction.user_id == uid))
        txs = result.scalars().all()
        print(f"Transaction logs found: {len(txs)}")
        for tx in txs:
            print(f"  - {tx.operation}: {tx.coins_charged} coins")
        
        if len(txs) == 2:
            print("Success: Found exactly 2 transactions.")
        else:
            print(f"ERROR: Expected 2 transactions, found {len(txs)}")

        # Cleanup
        await db.execute(delete(CoinTransaction).where(CoinTransaction.user_id == uid))
        await db.execute(delete(UserCredit).where(UserCredit.user_id == uid))
        await db.execute(delete(User).where(User.uid == uid))
        await db.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(repro())
