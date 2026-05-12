# backend/core/budget_guard.py
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.postgres_schema import UserCredit
from core.constants import FIXED_COST

async def deduct_coins(db: AsyncSession, user_id: str, operation: str) -> int:
    """
    Pre-flight coin deduction with strict row-level locking to prevent double-spending.
    Raises HTTPException (402 Payment Required) if insufficient funds.
    Returns the amount deducted.
    """
    if operation not in FIXED_COST:
        raise ValueError(f"Unknown operation: {operation}")

    cost = FIXED_COST[operation]

    # Use FOR UPDATE to lock the row during the transaction.
    # This ensures rapid double-clicks are queued and evaluated sequentially.
    query = select(UserCredit).where(UserCredit.user_id == user_id).with_for_update()

    result = await db.execute(query)
    user_credit = result.scalar_one_or_none()

    if not user_credit:
        raise HTTPException(status_code=402, detail="Account not found or no credit balance exists. Please contact support.")

    if user_credit.coins_balance < cost:
        raise HTTPException(
            status_code=402,
            detail="Not enough coins — top up or upgrade your plan"
        )

    # Perform deduction
    user_credit.coins_balance -= cost

    # Commit immediately to release the row-level lock BEFORE the AI call begins.
    # This guarantees the lock is held only for milliseconds, not for the duration of the Vertex AI call.
    await db.commit()

    return cost
