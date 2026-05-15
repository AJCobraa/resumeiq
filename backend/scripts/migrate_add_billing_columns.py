"""One-time migration for billing tables and columns (including webhook support)."""
import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import engine
from models.postgres_schema import Base

ALTER_USER_CREDITS = [
    """
    ALTER TABLE user_credits
    ADD COLUMN IF NOT EXISTS coins_granted_this_period INTEGER NOT NULL DEFAULT 0
    """,
    """
    ALTER TABLE user_credits
    ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ
    """,
    """
    ALTER TABLE user_credits
    ADD COLUMN IF NOT EXISTS ai_cost_usd_total NUMERIC NOT NULL DEFAULT 0.0
    """,
    """
    ALTER TABLE user_credits
    ADD COLUMN IF NOT EXISTS topup_coins_balance INTEGER NOT NULL DEFAULT 0
    """,
]

ALTER_PAYMENT_TRANSACTIONS_WEBHOOK = [
    """
    ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS webhook_event_id VARCHAR UNIQUE
    """,
    """
    ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS webhook_event_type VARCHAR
    """,
    """
    ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS webhook_status VARCHAR
    """,
    """
    ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS raw_webhook_json TEXT
    """,
    """
    ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS razorpay_invoice_id VARCHAR
    """,
]


async def migrate():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in ALTER_USER_CREDITS:
            await conn.execute(text(stmt))
        for stmt in ALTER_PAYMENT_TRANSACTIONS_WEBHOOK:
            await conn.execute(text(stmt))
    print("Migration complete (including webhook columns).")


asyncio.run(migrate())
