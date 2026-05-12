import pytest
from core.budget_guard import deduct_coins
from core.constants import FIXED_COST
from models.postgres_schema import UserCredit
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import MagicMock, AsyncMock

@pytest.mark.asyncio
async def test_deduct_coins_success():
    db_mock = AsyncMock(spec=AsyncSession)
    user_credit_mock = MagicMock(spec=UserCredit)
    user_credit_mock.coins_balance = 100

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = user_credit_mock
    db_mock.execute.return_value = result_mock

    cost = await deduct_coins(db_mock, "test_user", "parse_resume_pdf")

    assert cost == FIXED_COST["parse_resume_pdf"]
    assert user_credit_mock.coins_balance == 100 - FIXED_COST["parse_resume_pdf"]

@pytest.mark.asyncio
async def test_deduct_coins_insufficient_funds():
    db_mock = AsyncMock(spec=AsyncSession)
    user_credit_mock = MagicMock(spec=UserCredit)
    user_credit_mock.coins_balance = 10  # Less than 35 for parse_resume_pdf

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = user_credit_mock
    db_mock.execute.return_value = result_mock

    with pytest.raises(HTTPException) as exc_info:
        await deduct_coins(db_mock, "test_user", "parse_resume_pdf")

    assert exc_info.value.status_code == 402
    assert "Not enough coins" in exc_info.value.detail

@pytest.mark.asyncio
async def test_deduct_coins_batch_success():
    db_mock = AsyncMock(spec=AsyncSession)
    user_credit_mock = MagicMock(spec=UserCredit)
    user_credit_mock.coins_balance = 100

    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = user_credit_mock
    db_mock.execute.return_value = result_mock

    # Test import pdf costs (35 + 6 = 41)
    from core.budget_guard import deduct_coins_batch
    cost = await deduct_coins_batch(db_mock, "test_user", ["parse_resume_pdf", "embed_resume"])

    assert cost == 41
    assert user_credit_mock.coins_balance == 59  # 100 - 41
