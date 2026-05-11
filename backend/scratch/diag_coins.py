
import asyncio
from core.constants import FIXED_COST
from core.database import async_session
from sqlalchemy import select
from models.postgres_schema import UserCredit

async def diagnose():
    print(f"FIXED_COST: {FIXED_COST}")
    ops = ["parse_resume_pdf", "embed_resume"]
    total = sum(FIXED_COST[op] for op in ops)
    print(f"Calculated total for {ops}: {total}")
    
    # Check a real user if possible (or just verify logic)
    # Let's see if there's any logic in budget_guard that might be wrong
    from core import budget_guard
    print(f"budget_guard.deduct_coins_batch exists: {hasattr(budget_guard, 'deduct_coins_batch')}")

if __name__ == "__main__":
    asyncio.run(diagnose())
