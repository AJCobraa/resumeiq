"""
Razorpay Webhook Service — Signature verification, idempotent event processing,
subscription renewal, and payment state reconciliation.

This module is strictly backend-only.  No secrets are ever exposed to the frontend.

Key design decisions:
  - Webhook signature uses HMAC-SHA256 over the raw request body (not parsed JSON).
  - Idempotency is enforced via `webhook_event_id` (unique) and transaction/subscription
    state checks before any coin credit.
  - All state mutations run inside a single DB transaction with row-level locking.
"""
import os
import json
import hmac
import hashlib
import logging
import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.postgres_schema import (
    PaymentTransaction, Subscription, UserCredit,
    User, SubscriptionPlan, PlanType,
)
from services.billing_service import (
    CYCLE_MONTHS,
    calculate_coins_for_period,
)

logger = logging.getLogger("resumeiq.webhooks")

# ── Webhook signature verification ───────────────────
def verify_razorpay_webhook_signature(raw_body: bytes, received_signature: str) -> bool:
    """
    Verify webhook payload signature using HMAC-SHA256.
    Uses the raw request body exactly as received — never parsed/cast JSON.
    Returns True if the computed signature matches the received one (timing-safe).
    """
    secret = os.environ["RAZORPAY_WEBHOOK_SECRET"].encode("utf-8")
    expected = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received_signature)


# ── Event dispatch table ─────────────────────────────
HANDLED_EVENTS = {
    # Payment events
    "payment.authorized",
    "payment.captured",
    "payment.failed",
    "order.paid",
    # Subscription lifecycle events
    "subscription.activated",
    "subscription.charged",
    "subscription.cancelled",
    "subscription.paused",
    "subscription.resumed",
    "subscription.halted",
    "subscription.completed",
}


# ── Main webhook processor ───────────────────────────
async def process_razorpay_webhook(
    db: AsyncSession,
    raw_body: bytes,
    event_payload: dict,
) -> dict:
    """
    Process a verified Razorpay webhook event.
    Returns a dict with `status` ("processed" | "ignored" | "duplicate") and `message`.
    All DB mutations are committed in one transaction with row-level locking.
    """
    event_type = event_payload.get("event", "")
    event_id = event_payload.get("event_id") or event_payload.get("id")

    if event_type not in HANDLED_EVENTS:
        logger.info("Webhook event ignored (unhandled type): %s", event_type)
        return {"status": "ignored", "message": f"Event type '{event_type}' not handled."}

    # ── Idempotency: check if this event was already stored ──
    if event_id:
        existing = await db.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.webhook_event_id == event_id
            )
        )
        if existing.scalar_one_or_none():
            logger.info("Duplicate webhook event: %s (%s)", event_id, event_type)
            return {"status": "duplicate", "message": "Event already processed."}

    # ── Dispatch to handler ──────────────────────────
    try:
        if event_type == "payment.captured":
            result = await _handle_payment_captured(db, event_payload, event_id, raw_body)
        elif event_type == "payment.authorized":
            result = await _handle_payment_authorized(db, event_payload, event_id, raw_body)
        elif event_type == "payment.failed":
            result = await _handle_payment_failed(db, event_payload, event_id, raw_body)
        elif event_type == "order.paid":
            result = await _handle_order_paid(db, event_payload, event_id, raw_body)
        elif event_type == "subscription.activated":
            result = await _handle_subscription_activated(db, event_payload, event_id, raw_body)
        elif event_type == "subscription.charged":
            result = await _handle_subscription_charged(db, event_payload, event_id, raw_body)
        elif event_type == "subscription.cancelled":
            result = await _handle_subscription_cancelled(db, event_payload, event_id, raw_body)
        elif event_type == "subscription.paused":
            result = await _handle_subscription_state_change(db, event_payload, event_id, raw_body, "paused")
        elif event_type == "subscription.resumed":
            result = await _handle_subscription_state_change(db, event_payload, event_id, raw_body, "active")
        elif event_type == "subscription.halted":
            result = await _handle_subscription_state_change(db, event_payload, event_id, raw_body, "halted")
        elif event_type == "subscription.completed":
            result = await _handle_subscription_state_change(db, event_payload, event_id, raw_body, "completed")
        else:
            result = {"status": "ignored", "message": f"No handler for {event_type}"}

        await db.commit()
        return result

    except Exception:
        await db.rollback()
        logger.exception("Webhook processing error for event %s (%s)", event_id, event_type)
        raise


# ── Helper: extract payment entity from webhook payload ──
def _extract_payment_entity(payload: dict) -> dict:
    """Extract the payment entity from a standard Razorpay webhook payload."""
    return payload.get("payload", {}).get("payment", {}).get("entity", {})


def _extract_subscription_entity(payload: dict) -> dict:
    """Extract the subscription entity from a standard Razorpay webhook payload."""
    return payload.get("payload", {}).get("subscription", {}).get("entity", {})


# ── Helper: find transaction by order or payment ─────
async def _find_transaction_by_order_or_payment(
    db: AsyncSession, order_id: str | None, payment_id: str | None
) -> PaymentTransaction | None:
    """Look up a PaymentTransaction by razorpay_order_id or razorpay_payment_id."""
    if order_id:
        result = await db.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.razorpay_order_id == order_id
            ).with_for_update()
        )
        tx = result.scalar_one_or_none()
        if tx:
            return tx

    if payment_id:
        result = await db.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.razorpay_payment_id == payment_id
            ).with_for_update()
        )
        tx = result.scalar_one_or_none()
        if tx:
            return tx

    return None


# ── Helper: stamp webhook audit fields on a transaction ──
def _stamp_webhook_fields(
    tx: PaymentTransaction,
    event_id: str | None,
    event_type: str,
    raw_body: bytes,
    status: str,
):
    """Write webhook tracking columns, only if webhook_event_id is not yet set."""
    if not tx.webhook_event_id and event_id:
        tx.webhook_event_id = event_id
    tx.webhook_event_type = event_type
    tx.webhook_status = status
    tx.raw_webhook_json = raw_body.decode("utf-8", errors="replace")


# ══════════════════════════════════════════════════════
#  PAYMENT EVENT HANDLERS
# ══════════════════════════════════════════════════════

async def _handle_payment_authorized(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes
) -> dict:
    """
    payment.authorized — Informational only for Standard Checkout.
    We log the event but do NOT credit coins (that happens on capture/verify).
    """
    payment = _extract_payment_entity(payload)
    order_id = payment.get("order_id")
    payment_id = payment.get("id")

    tx = await _find_transaction_by_order_or_payment(db, order_id, payment_id)
    if not tx:
        logger.info("payment.authorized for unknown order %s — ignoring", order_id)
        return {"status": "ignored", "message": "No matching transaction found."}

    # Only update if still pending
    if tx.status == "pending":
        tx.razorpay_payment_id = payment_id
        _stamp_webhook_fields(tx, event_id, "payment.authorized", raw_body, "processed")

    return {"status": "processed", "message": "Payment authorization noted."}


async def _handle_payment_captured(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes
) -> dict:
    """
    payment.captured — Confirm payment capture.
    If the frontend /verify flow already processed this, we skip (idempotent).
    Otherwise, credit coins the same way process_verified_payment does.
    """
    payment = _extract_payment_entity(payload)
    order_id = payment.get("order_id")
    payment_id = payment.get("id")

    tx = await _find_transaction_by_order_or_payment(db, order_id, payment_id)
    if not tx:
        logger.info("payment.captured for unknown order %s — ignoring", order_id)
        return {"status": "ignored", "message": "No matching transaction found."}

    # Idempotency: already processed by /verify or a previous webhook
    if tx.status == "success":
        _stamp_webhook_fields(tx, event_id, "payment.captured", raw_body, "ignored")
        return {"status": "duplicate", "message": "Payment already processed (success)."}

    # Credit coins
    await _credit_coins_for_transaction(db, tx)

    tx.status = "success"
    tx.razorpay_payment_id = payment_id
    _stamp_webhook_fields(tx, event_id, "payment.captured", raw_body, "processed")

    logger.info("payment.captured processed for tx %s, coins=%d", tx.id, tx.coins_credited)
    return {"status": "processed", "message": f"Payment captured, {tx.coins_credited} coins credited."}


async def _handle_payment_failed(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes
) -> dict:
    """
    payment.failed — Mark the matching transaction as failed.
    Never credit coins on failure.
    """
    payment = _extract_payment_entity(payload)
    order_id = payment.get("order_id")
    payment_id = payment.get("id")

    tx = await _find_transaction_by_order_or_payment(db, order_id, payment_id)
    if not tx:
        logger.info("payment.failed for unknown order %s — ignoring", order_id)
        return {"status": "ignored", "message": "No matching transaction found."}

    # Don't downgrade a success to failed (Razorpay can send failed then captured)
    if tx.status == "success":
        _stamp_webhook_fields(tx, event_id, "payment.failed", raw_body, "ignored")
        return {"status": "ignored", "message": "Transaction already successful, ignoring failure."}

    tx.status = "failed"
    tx.razorpay_payment_id = payment_id
    tx.failure_reason = (
        payment.get("error_description")
        or payment.get("error_reason")
        or "Payment failed"
    )
    _stamp_webhook_fields(tx, event_id, "payment.failed", raw_body, "processed")

    logger.info("payment.failed processed for tx %s", tx.id)
    return {"status": "processed", "message": "Payment marked failed."}


async def _handle_order_paid(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes
) -> dict:
    """
    order.paid — Reconciliation event.
    If the transaction is still pending, treat it like a captured payment.
    If already success, skip.
    """
    order_entity = payload.get("payload", {}).get("order", {}).get("entity", {})
    order_id = order_entity.get("id")

    if not order_id:
        return {"status": "ignored", "message": "No order ID in payload."}

    result = await db.execute(
        select(PaymentTransaction).where(
            PaymentTransaction.razorpay_order_id == order_id
        ).with_for_update()
    )
    tx = result.scalar_one_or_none()

    if not tx:
        logger.info("order.paid for unknown order %s — ignoring", order_id)
        return {"status": "ignored", "message": "No matching transaction found."}

    if tx.status == "success":
        _stamp_webhook_fields(tx, event_id, "order.paid", raw_body, "ignored")
        return {"status": "duplicate", "message": "Order already paid."}

    # Credit coins as reconciliation
    await _credit_coins_for_transaction(db, tx)

    tx.status = "success"
    _stamp_webhook_fields(tx, event_id, "order.paid", raw_body, "processed")

    logger.info("order.paid processed (reconciliation) for tx %s", tx.id)
    return {"status": "processed", "message": f"Order paid, {tx.coins_credited} coins credited."}


# ══════════════════════════════════════════════════════
#  SUBSCRIPTION EVENT HANDLERS
# ══════════════════════════════════════════════════════

async def _handle_subscription_activated(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes
) -> dict:
    """
    subscription.activated — Mark subscription active, save Razorpay subscription ID.
    Do not overwrite a more advanced state.
    """
    sub_entity = _extract_subscription_entity(payload)
    razorpay_sub_id = sub_entity.get("id")

    if not razorpay_sub_id:
        return {"status": "ignored", "message": "No subscription ID in payload."}

    result = await db.execute(
        select(Subscription).where(
            Subscription.razorpay_sub_id == razorpay_sub_id
        ).with_for_update()
    )
    sub = result.scalar_one_or_none()

    if not sub:
        # Try to find by user_id from notes
        plan_id = sub_entity.get("plan_id") or sub_entity.get("notes", {}).get("plan_id")
        logger.info("subscription.activated for unknown sub %s — ignoring", razorpay_sub_id)
        return {"status": "ignored", "message": "No matching subscription found."}

    # Don't downgrade: only activate if currently in a weaker state
    if sub.status not in ("pending", "created", "authenticated"):
        logger.info("subscription.activated ignored — sub already in state '%s'", sub.status)
        return {"status": "ignored", "message": f"Subscription already in state '{sub.status}'."}

    sub.status = "active"
    sub.razorpay_sub_id = razorpay_sub_id

    logger.info("subscription.activated processed for sub %s", sub.id)
    return {"status": "processed", "message": "Subscription activated."}


async def _handle_subscription_charged(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes
) -> dict:
    """
    subscription.charged — The key recurring-charge event.
    Extends period, credits subscription coins for the new cycle.
    Must be idempotent: check if this period has already been credited.
    """
    sub_entity = _extract_subscription_entity(payload)
    razorpay_sub_id = sub_entity.get("id")
    payment_entity = _extract_payment_entity(payload)
    payment_id = payment_entity.get("id") if payment_entity else None

    if not razorpay_sub_id:
        return {"status": "ignored", "message": "No subscription ID in payload."}

    # Find the subscription
    result = await db.execute(
        select(Subscription).where(
            Subscription.razorpay_sub_id == razorpay_sub_id
        ).with_for_update()
    )
    sub = result.scalar_one_or_none()

    if not sub:
        logger.info("subscription.charged for unknown sub %s — ignoring", razorpay_sub_id)
        return {"status": "ignored", "message": "No matching subscription found."}

    now = datetime.datetime.now(datetime.timezone.utc)

    # Load the plan for coin calculation
    plan_result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.plan_id == sub.plan_id)
    )
    plan = plan_result.scalar_one_or_none()
    if not plan:
        return {"status": "ignored", "message": f"Plan '{sub.plan_id}' not found."}

    coins_for_period = calculate_coins_for_period(plan, sub.billing_cycle)
    months = CYCLE_MONTHS.get(sub.billing_cycle, 1)
    new_period_start = sub.period_end if sub.period_end and sub.period_end > now else now
    new_period_end = new_period_start + datetime.timedelta(days=30 * months)

    # Idempotency: check if a renewal transaction for this period already exists
    existing_renewal = await db.execute(
        select(PaymentTransaction).where(
            PaymentTransaction.user_id == sub.user_id,
            PaymentTransaction.transaction_type == "subscription_renewal",
            PaymentTransaction.plan_id == sub.plan_id,
            PaymentTransaction.status == "success",
            PaymentTransaction.razorpay_payment_id == payment_id,
        )
    )
    if existing_renewal.scalar_one_or_none():
        logger.info("subscription.charged duplicate — renewal already applied for payment %s", payment_id)
        return {"status": "duplicate", "message": "Renewal already applied for this charge."}

    # Lock and update user credit
    credit_result = await db.execute(
        select(UserCredit).where(UserCredit.user_id == sub.user_id).with_for_update()
    )
    credit = credit_result.scalar_one_or_none()

    if credit:
        # Reset subscription coins for the new period
        credit.coins_balance = coins_for_period
        credit.coins_granted_this_period = coins_for_period
        credit.period_start = new_period_start
        credit.billing_cycle_end = new_period_end

    # Update subscription period
    sub.period_start = new_period_start
    sub.period_end = new_period_end
    sub.status = "active"

    # Calculate amounts for the renewal transaction record
    amount_per_month = plan.price_inr  # Default to INR
    total_amount = amount_per_month * months

    # Create a renewal PaymentTransaction for audit
    renewal_tx = PaymentTransaction(
        user_id=sub.user_id,
        transaction_type="subscription_renewal",
        plan_id=sub.plan_id,
        billing_cycle=sub.billing_cycle,
        coins_credited=coins_for_period,
        amount_inr=total_amount,
        amount_usd=Decimal("0"),
        currency="INR",
        razorpay_payment_id=payment_id,
        razorpay_order_id=None,  # Renewals don't have a separate order; UNIQUE constraint on this column
        status="success",
        webhook_event_id=event_id,
        webhook_event_type="subscription.charged",
        webhook_status="processed",
        raw_webhook_json=raw_body.decode("utf-8", errors="replace"),
    )
    db.add(renewal_tx)

    logger.info(
        "subscription.charged processed for sub %s — %d coins, period %s to %s",
        sub.id, coins_for_period, new_period_start.date(), new_period_end.date(),
    )
    return {
        "status": "processed",
        "message": f"Renewal: {coins_for_period} coins credited, period extended to {new_period_end.date()}.",
    }


async def _handle_subscription_cancelled(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes
) -> dict:
    """
    subscription.cancelled — Mark subscription cancelled.
    Keep coins and access until period_end.
    """
    sub_entity = _extract_subscription_entity(payload)
    razorpay_sub_id = sub_entity.get("id")

    if not razorpay_sub_id:
        return {"status": "ignored", "message": "No subscription ID in payload."}

    result = await db.execute(
        select(Subscription).where(
            Subscription.razorpay_sub_id == razorpay_sub_id
        ).with_for_update()
    )
    sub = result.scalar_one_or_none()

    if not sub:
        logger.info("subscription.cancelled for unknown sub %s — ignoring", razorpay_sub_id)
        return {"status": "ignored", "message": "No matching subscription found."}

    # Don't overwrite a terminal state
    if sub.status in ("completed", "expired"):
        return {"status": "ignored", "message": f"Subscription already in terminal state '{sub.status}'."}

    now = datetime.datetime.now(datetime.timezone.utc)
    sub.status = "cancelled"
    sub.cancelled_at = now

    logger.info("subscription.cancelled processed for sub %s — access until %s", sub.id, sub.period_end)
    return {"status": "processed", "message": "Subscription cancelled. Access continues until period end."}


async def _handle_subscription_state_change(
    db: AsyncSession, payload: dict, event_id: str | None, raw_body: bytes,
    target_status: str,
) -> dict:
    """
    Generic handler for subscription state transitions:
      - subscription.paused  → status = "paused"
      - subscription.resumed → status = "active"
      - subscription.halted  → status = "halted"
      - subscription.completed → status = "completed"
    """
    sub_entity = _extract_subscription_entity(payload)
    razorpay_sub_id = sub_entity.get("id")

    if not razorpay_sub_id:
        return {"status": "ignored", "message": "No subscription ID in payload."}

    result = await db.execute(
        select(Subscription).where(
            Subscription.razorpay_sub_id == razorpay_sub_id
        ).with_for_update()
    )
    sub = result.scalar_one_or_none()

    if not sub:
        logger.info("subscription.%s for unknown sub %s — ignoring", target_status, razorpay_sub_id)
        return {"status": "ignored", "message": "No matching subscription found."}

    # Terminal states should not be overwritten by weaker events
    terminal_states = {"completed", "expired"}
    if sub.status in terminal_states and target_status not in terminal_states:
        return {"status": "ignored", "message": f"Subscription in terminal state '{sub.status}'."}

    sub.status = target_status
    if target_status == "completed":
        sub.cancelled_at = sub.cancelled_at or datetime.datetime.now(datetime.timezone.utc)

    logger.info("subscription.%s processed for sub %s", target_status, sub.id)
    return {"status": "processed", "message": f"Subscription status updated to '{target_status}'."}


# ══════════════════════════════════════════════════════
#  SHARED: Credit coins for a PaymentTransaction
# ══════════════════════════════════════════════════════

async def _credit_coins_for_transaction(db: AsyncSession, tx: PaymentTransaction):
    """
    Credit coins to the correct pool based on transaction type.
    Creates/updates subscription if it's a subscription payment.
    Uses row-level locking on UserCredit.
    """
    credit_result = await db.execute(
        select(UserCredit).where(UserCredit.user_id == tx.user_id).with_for_update()
    )
    credit = credit_result.scalar_one_or_none()
    if not credit:
        logger.warning("No UserCredit row for user %s — cannot credit coins", tx.user_id)
        return

    now = datetime.datetime.now(datetime.timezone.utc)

    if tx.transaction_type == "topup":
        credit.topup_coins_balance += tx.coins_credited
    else:
        # Subscription payment
        credit.coins_balance += tx.coins_credited
        credit.coins_granted_this_period = tx.coins_credited

        # Cancel existing active subscriptions
        active_subs = await db.execute(
            select(Subscription).where(
                Subscription.user_id == tx.user_id,
                Subscription.status == "active",
            )
        )
        for sub in active_subs.scalars():
            sub.status = "cancelled"
            sub.cancelled_at = now

        # Calculate period
        months = CYCLE_MONTHS.get(tx.billing_cycle, 1)
        period_end = now + datetime.timedelta(days=30 * months)

        # Create new subscription
        new_sub = Subscription(
            user_id=tx.user_id,
            plan_id=tx.plan_id,
            billing_cycle=tx.billing_cycle,
            status="active",
            coins_per_period=tx.coins_credited,
            period_start=now,
            period_end=period_end,
            razorpay_order_id=tx.razorpay_order_id,
            razorpay_payment_id=tx.razorpay_payment_id,
        )
        db.add(new_sub)

        # Update user plan type
        user_result = await db.execute(select(User).where(User.uid == tx.user_id))
        user = user_result.scalar_one_or_none()
        if user and tx.plan_id:
            user.plan_type = PlanType[tx.plan_id]

        # Update credit period tracking
        credit.billing_cycle_end = period_end
        credit.period_start = now
