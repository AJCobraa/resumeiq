# backend/core/budget_guard.py
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.postgres_schema import UserCredit, CoinTransaction
from core.constants import FIXED_COST

async def deduct_coins(db: AsyncSession, user_id: str, operation: str) -> int:
    """
    Pre-flight coin deduction with strict row-level locking to prevent double-spending.
    Deduction priority:
      1. coins_balance (subscription pool)
      2. topup_coins_balance (never-expiring pool)
      3. HTTP 402 if both empty
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

    total_available = user_credit.coins_balance + user_credit.topup_coins_balance
    if total_available < cost:
        raise HTTPException(
            status_code=402,
            detail="Not enough coins — top up or upgrade your plan"
        )

    # Deduct from subscription pool first, then top-up pool
    if user_credit.coins_balance >= cost:
        user_credit.coins_balance -= cost
    else:
        # Partial from subscription, remainder from top-up
        remainder = cost - user_credit.coins_balance
        user_credit.coins_balance = 0
        user_credit.topup_coins_balance -= remainder

    # Log the transaction (Audit trail)
    # Note: tokens will be updated later by model_logger if this is an AI call.
    db.add(CoinTransaction(
        user_id=user_id,
        operation=operation,
        coins_charged=cost
    ))

    # Commit immediately to release the row-level lock BEFORE the AI call begins.
    # This guarantees the lock is held only for milliseconds, not for the duration of the Vertex AI call.
    await db.commit()

    return cost


async def deduct_coins_batch(db: AsyncSession, user_id: str, operations: list[str]) -> int:
    """
    Batch coin deduction for multi-step processes (e.g. PDF import).
    Atomic upfront check and deduction for ALL involved operations.
    Deduction priority: subscription pool → top-up pool → HTTP 402.
    Returns the total amount deducted.
    """
    total_cost = 0
    for op in operations:
        if op not in FIXED_COST:
            raise ValueError(f"Unknown operation: {op}")
        total_cost += FIXED_COST[op]

    # Use FOR UPDATE to lock the row during the transaction.
    query = select(UserCredit).where(UserCredit.user_id == user_id).with_for_update()

    result = await db.execute(query)
    user_credit = result.scalar_one_or_none()

    if not user_credit:
        raise HTTPException(
            status_code=402, 
            detail="Account not found or no credit balance exists. Please contact support."
        )

    total_available = user_credit.coins_balance + user_credit.topup_coins_balance
    if total_available < total_cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient coins for this operation. Required: {total_cost}, Balance: {total_available}"
        )

    # Deduct from subscription pool first, then top-up pool
    if user_credit.coins_balance >= total_cost:
        user_credit.coins_balance -= total_cost
    else:
        remainder = total_cost - user_credit.coins_balance
        user_credit.coins_balance = 0
        user_credit.topup_coins_balance -= remainder

    # Log each operation separately for clear auditing
    for op in operations:
        db.add(CoinTransaction(
            user_id=user_id,
            operation=op,
            coins_charged=FIXED_COST[op]
        ))

    # Commit immediately to release the row-level lock.
    await db.commit()

    return total_cost
