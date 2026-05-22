"""
Billing router — subscription management, top-ups, and payment verification.
All routes require authentication via verify_token (AGENTS.md rule).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from firebase_admin_init import verify_token
from core.database import get_db_session
from models.billing_model import (
    CreateSubscriptionOrderRequest,
    CreateTopUpOrderRequest,
    VerifyPaymentRequest,
    CancelSubscriptionRequest,
)
from services.billing_service import (
    get_billing_status,
    get_catalog,
    create_subscription_order,
    create_topup_order,
    process_verified_payment,
    cancel_subscription,
)

router = APIRouter(prefix="/api/billing", tags=["Billing"])


@router.get("/status")
async def billing_status(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Return current billing status for the authenticated user."""
    result = await get_billing_status(db, uid)
    if not result:
        raise HTTPException(404, "User not found.")
    return result


@router.get("/plans/catalog")
async def plans_catalog(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Return all active subscription plans and top-up packs."""
    return await get_catalog(db)


@router.post("/subscription/order")
async def subscription_order(
    body: CreateSubscriptionOrderRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a Razorpay order for a new subscription."""
    return await create_subscription_order(db, uid, body.plan_id, body.billing_cycle, body.currency)


@router.post("/topup/order")
async def topup_order(
    body: CreateTopUpOrderRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a Razorpay order for a top-up pack."""
    return await create_topup_order(db, uid, body.pack_id, body.currency)


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Verify a completed Razorpay payment and credit coins."""
    return await process_verified_payment(
        db,
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
        uid=uid,
    )


@router.post("/subscription/cancel")
async def cancel_sub(
    body: CancelSubscriptionRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Cancel the active subscription. Access continues until period end."""
    return await cancel_subscription(db, uid, body.reason)
