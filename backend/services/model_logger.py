"""
Model Logger — logs AI model calls to PostgreSQL.
Tracks token usage, loaded token cost, model name, and operation type.
Calculates the `actual_cost_usd` safely according to Method C formulas.

Uses asyncio.create_task() for fire-and-forget logging from within the
running event loop. Never creates a new event loop (which would conflict
with asyncpg's connection pool bound to the main loop).
"""
import asyncio
from core.database import async_session
from models.postgres_schema import CoinTransaction
from core.constants import FIXED_COST
import os

MODEL_RATES = {
    "gemma-4-31b-it": {"input": 0.00000015, "output": 0.00000060},
    "gemini-embedding-001": {"input": 0.00000015, "output": 0.0},
}

async def log_model_call(
    user_id: str,
    model: str,
    operation: str,
    input_tokens: int,
    output_tokens: int,
):
    """
    Log the model usage and calculate actual cost for internal telemetry.
    This inserts a row into the `coin_transactions` Postgres table.
    """
    try:
        app_env = os.environ.get("APP_ENV", "dev")

        # Dev environment uses Google AI Studio (free), so cost is $0.00
        actual_cost_usd = 0.0

        if app_env == "prod":
            rates = MODEL_RATES.get(model, {"input": 0.0, "output": 0.0})

            # The actual cost USD is the raw bill from Google, WITHOUT the 2.0 multiplier
            # The 2.0 multiplier was already baked into the fixed coin charge for margin
            actual_cost_usd = (input_tokens * rates["input"]) + (output_tokens * rates["output"])

        coins_charged = FIXED_COST.get(operation, 0)

        async with async_session() as session:
            transaction = CoinTransaction(
                user_id=user_id,
                operation=operation,
                coins_charged=coins_charged,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                actual_cost_usd=actual_cost_usd
            )
            session.add(transaction)
            await session.commit()

    except Exception as e:
        print(f"Failed to log model call: {e}") # Non-blocking failure

def schedule_log_model_call(
    user_id: str,
    model: str,
    operation: str,
    input_tokens: int,
    output_tokens: int,
):
    """
    Schedule the async logger as a fire-and-forget task on the RUNNING event loop.
    This replaces fire_log_model_call_sync which broke by creating a new loop.
    Safe to call from both sync callbacks (in the same thread) and async code.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            log_model_call(user_id, model, operation, input_tokens, output_tokens)
        )
    except RuntimeError:
        # No running loop (shouldn't happen in FastAPI context, but safety fallback)
        print("Warning: No running event loop for model logging — skipping.")


# Keep backward compatibility alias
fire_log_model_call_sync = schedule_log_model_call
