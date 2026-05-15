"""
Billing service — Razorpay integration, subscription management, and coin pool logic.

All Razorpay SDK calls are synchronous and MUST be wrapped in asyncio.to_thread().
Amounts sent to Razorpay are always in the smallest currency unit (paise / cents).
"""
import os
import hmac
import hashlib
import asyncio
import datetime
import uuid
from decimal import Decimal

import razorpay
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.postgres_schema import (
    SubscriptionPlan, Subscription, TopUpPack,
    PaymentTransaction, UserCredit, User, PlanType,
)
from core.database import engine

# ── Billing cycle rules ──────────────────────────────
CYCLE_COIN_MULTIPLIERS = {
    'monthly': 1.00,
    'quarterly': 1.10,
    'biannual': 1.15,
}

CYCLE_MONTHS = {
    'monthly': 1,
    'quarterly': 3,
    'biannual': 6,
}

# ── Razorpay client (lazy init) ──────────────────────
_razorpay_client = None


def _get_razorpay_client():
    global _razorpay_client
    if _razorpay_client is None:
        _razorpay_client = razorpay.Client(
            auth=(os.environ['RAZORPAY_KEY_ID'], os.environ['RAZORPAY_KEY_SECRET'])
        )
    return _razorpay_client


# ── Price / Coin helpers ─────────────────────────────
def calculate_order_amount(plan, billing_cycle: str, currency: str):
    """Return total price for the billing period."""
    months = CYCLE_MONTHS[billing_cycle]
    price = plan.price_inr if currency == 'INR' else plan.price_usd
    return price * months


def calculate_coins_for_period(plan, billing_cycle: str) -> int:
    """Return total coins granted for the billing period (with multiplier bonus)."""
    multiplier = CYCLE_COIN_MULTIPLIERS[billing_cycle]
    months = CYCLE_MONTHS[billing_cycle]
    return round(plan.coins_monthly * multiplier * months)


def _to_smallest_unit(amount, currency: str) -> int:
    """Convert a Decimal/float amount to the smallest currency unit (paise/cents)."""
    multiplier = 100
    return int(Decimal(str(amount)) * multiplier)


# ── Signature verification ───────────────────────────
def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature using HMAC-SHA256."""
    key_secret = os.environ['RAZORPAY_KEY_SECRET'].encode('utf-8')
    message = f"{order_id}|{payment_id}".encode('utf-8')
    expected = hmac.new(key_secret, message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


# ── Seed catalog (idempotent) ────────────────────────
async def seed_catalog():
    """Insert default subscription plans and top-up packs if they don't exist."""
    plans = [
        SubscriptionPlan(plan_id='free', display_name='Free', price_inr=0, price_usd=0, coins_monthly=100, resume_limit=1),
        SubscriptionPlan(plan_id='starter', display_name='Starter', price_inr=415, price_usd=5, coins_monthly=22750, resume_limit=3),
        SubscriptionPlan(plan_id='pro', display_name='Pro', price_inr=1245, price_usd=15, coins_monthly=82000, resume_limit=10),
        SubscriptionPlan(plan_id='growth', display_name='Growth', price_inr=2490, price_usd=30, coins_monthly=182000, resume_limit=None),
    ]
    packs = [
        TopUpPack(pack_id='small', display_name='Small', price_inr=62, price_usd=Decimal('0.75'), coins=5000),
        TopUpPack(pack_id='medium', display_name='Medium', price_inr=125, price_usd=Decimal('1.50'), coins=12000),
        TopUpPack(pack_id='large', display_name='Large', price_inr=208, price_usd=Decimal('2.50'), coins=25000),
    ]

    async with engine.begin() as conn:
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from models.postgres_schema import Base

        for plan in plans:
            stmt = pg_insert(SubscriptionPlan).values(
                plan_id=plan.plan_id,
                display_name=plan.display_name,
                price_inr=plan.price_inr,
                price_usd=plan.price_usd,
                coins_monthly=plan.coins_monthly,
                resume_limit=plan.resume_limit,
                is_active=True,
            ).on_conflict_do_update(
                index_elements=['plan_id'],
                set_=dict(
                    display_name=plan.display_name,
                    price_inr=plan.price_inr,
                    price_usd=plan.price_usd,
                    coins_monthly=plan.coins_monthly,
                    resume_limit=plan.resume_limit,
                ),
            )
            await conn.execute(stmt)

        for pack in packs:
            stmt = pg_insert(TopUpPack).values(
                pack_id=pack.pack_id,
                display_name=pack.display_name,
                price_inr=pack.price_inr,
                price_usd=pack.price_usd,
                coins=pack.coins,
                is_active=True,
            ).on_conflict_do_update(
                index_elements=['pack_id'],
                set_=dict(
                    display_name=pack.display_name,
                    price_inr=pack.price_inr,
                    price_usd=pack.price_usd,
                    coins=pack.coins,
                ),
            )
            await conn.execute(stmt)


# ── Create subscription order ────────────────────────
async def create_subscription_order(
    db: AsyncSession, uid: str, plan_id: str, billing_cycle: str, currency: str
):
    """Create a Razorpay order for a new subscription."""
    from fastapi import HTTPException

    if billing_cycle not in CYCLE_MONTHS:
        raise HTTPException(400, f"Invalid billing cycle: {billing_cycle}")

    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.plan_id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan or not plan.is_active:
        raise HTTPException(400, f"Plan '{plan_id}' not found or inactive.")

    if plan_id == 'free':
        raise HTTPException(400, "Cannot create a paid order for the free plan.")

    amount = calculate_order_amount(plan, billing_cycle, currency)
    coins = calculate_coins_for_period(plan, billing_cycle)
    amount_smallest = _to_smallest_unit(amount, currency)

    # Create Razorpay order (sync SDK → to_thread)
    client = _get_razorpay_client()
    order_data = await asyncio.to_thread(
        client.order.create,
        {
            'amount': amount_smallest,
            'currency': currency,
            'notes': {
                'user_id': uid,
                'plan_id': plan_id,
                'billing_cycle': billing_cycle,
                'coins': str(coins),
            },
        }
    )

    # Persist pending transaction
    tx = PaymentTransaction(
        user_id=uid,
        transaction_type='subscription_new',
        plan_id=plan_id,
        billing_cycle=billing_cycle,
        coins_credited=coins,
        amount_inr=amount if currency == 'INR' else 0,
        amount_usd=amount if currency == 'USD' else 0,
        currency=currency,
        razorpay_order_id=order_data['id'],
        status='pending',
    )
    db.add(tx)
    await db.commit()

    return {
        'orderId': order_data['id'],
        'amount': amount_smallest,
        'currency': currency,
        'planId': plan_id,
        'billingCycle': billing_cycle,
    }


# ── Create top-up order ──────────────────────────────
async def create_topup_order(db: AsyncSession, uid: str, pack_id: str, currency: str):
    """Create a Razorpay order for a top-up pack."""
    from fastapi import HTTPException

    # Block free-plan users
    user_result = await db.execute(select(User).where(User.uid == uid))
    user = user_result.scalar_one_or_none()
    if not user or user.plan_type == PlanType.free:
        raise HTTPException(403, "Top-ups are only available on paid plans.")

    result = await db.execute(select(TopUpPack).where(TopUpPack.pack_id == pack_id))
    pack = result.scalar_one_or_none()
    if not pack or not pack.is_active:
        raise HTTPException(400, f"Pack '{pack_id}' not found or inactive.")

    price = pack.price_inr if currency == 'INR' else pack.price_usd
    amount_smallest = _to_smallest_unit(price, currency)

    client = _get_razorpay_client()
    order_data = await asyncio.to_thread(
        client.order.create,
        {
            'amount': amount_smallest,
            'currency': currency,
            'notes': {
                'user_id': uid,
                'pack_id': pack_id,
                'coins': str(pack.coins),
            },
        }
    )

    tx = PaymentTransaction(
        user_id=uid,
        transaction_type='topup',
        pack_id=pack_id,
        coins_credited=pack.coins,
        amount_inr=price if currency == 'INR' else 0,
        amount_usd=price if currency == 'USD' else 0,
        currency=currency,
        razorpay_order_id=order_data['id'],
        status='pending',
    )
    db.add(tx)
    await db.commit()

    return {
        'orderId': order_data['id'],
        'amount': amount_smallest,
        'currency': currency,
        'packId': pack_id,
    }


# ── Process verified payment ─────────────────────────
async def process_verified_payment(
    db: AsyncSession,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
):
    """
    Verify Razorpay signature, credit coins, activate subscription if applicable.
    Idempotent — re-processing an already-successful transaction returns the cached result.
    """
    from fastapi import HTTPException

    # 1. Verify signature
    if not verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        raise HTTPException(400, "Invalid payment signature.")

    # 2. Load pending transaction
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.razorpay_order_id == razorpay_order_id)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(404, "Transaction not found.")

    # 3. Idempotency guard
    if tx.status == 'success':
        return {
            'success': True,
            'coinsAdded': tx.coins_credited,
            'message': 'Payment already processed.',
        }

    # 4. Lock user credit row
    credit_result = await db.execute(
        select(UserCredit).where(UserCredit.user_id == tx.user_id).with_for_update()
    )
    credit = credit_result.scalar_one_or_none()
    if not credit:
        raise HTTPException(404, "User credit record not found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    response = {'success': True, 'coinsAdded': tx.coins_credited}

    # 5. Credit coins to correct pool
    if tx.transaction_type == 'topup':
        # Top-up coins go to the never-expiring pool
        credit.topup_coins_balance += tx.coins_credited
    else:
        # Subscription coins → subscription pool
        credit.coins_balance += tx.coins_credited
        credit.coins_granted_this_period = tx.coins_credited

        # Load plan for subscription setup
        plan_result = await db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.plan_id == tx.plan_id)
        )
        plan = plan_result.scalar_one_or_none()

        # Cancel any existing active subscription
        active_subs = await db.execute(
            select(Subscription).where(
                Subscription.user_id == tx.user_id,
                Subscription.status == 'active',
            )
        )
        for sub in active_subs.scalars():
            sub.status = 'cancelled'
            sub.cancelled_at = now

        # Calculate period
        months = CYCLE_MONTHS.get(tx.billing_cycle, 1)
        period_end = now + datetime.timedelta(days=30 * months)

        # Create new subscription
        new_sub = Subscription(
            user_id=tx.user_id,
            plan_id=tx.plan_id,
            billing_cycle=tx.billing_cycle,
            status='active',
            coins_per_period=tx.coins_credited,
            period_start=now,
            period_end=period_end,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
        )
        db.add(new_sub)

        # Update user plan type using Enum value
        user_result = await db.execute(select(User).where(User.uid == tx.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.plan_type = PlanType[tx.plan_id]

        # Update credit period tracking
        credit.billing_cycle_end = period_end
        credit.period_start = now

        response['planId'] = tx.plan_id

    # 6. Mark transaction success
    tx.status = 'success'
    tx.razorpay_payment_id = razorpay_payment_id
    tx.razorpay_signature = razorpay_signature

    # 7. Compute new balance for response
    response['newBalance'] = credit.coins_balance + credit.topup_coins_balance

    await db.commit()
    return response


# ── Cancel subscription ──────────────────────────────
async def cancel_subscription(db: AsyncSession, uid: str, reason: str | None):
    """
    Mark active subscription as cancelled.
    User keeps access until period_end — plan_type is NOT changed immediately.
    """
    from fastapi import HTTPException

    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == uid,
            Subscription.status == 'active',
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "No active subscription found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    sub.status = 'cancelled'
    sub.cancelled_at = now
    await db.commit()

    return {
        'success': True,
        'message': 'Subscription cancelled. Access continues until period end.',
        'periodEnd': sub.period_end.isoformat() if sub.period_end else None,
    }


# ── Billing status ───────────────────────────────────
async def get_billing_status(db: AsyncSession, uid: str):
    """Return comprehensive billing status for the user."""
    # User info
    user_result = await db.execute(select(User).where(User.uid == uid))
    user = user_result.scalar_one_or_none()
    if not user:
        return None

    # Credit info
    credit_result = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
    credit = credit_result.scalar_one_or_none()

    coins_balance = credit.coins_balance if credit else 0
    topup_balance = credit.topup_coins_balance if credit else 0

    # Active subscription
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == uid,
            Subscription.status.in_(['active', 'cancelled']),
        ).order_by(desc(Subscription.created_at)).limit(1)
    )
    sub = sub_result.scalar_one_or_none()

    # Plan info
    plan_id = user.plan_type.value if user.plan_type else 'free'
    plan_result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.plan_id == plan_id))
    plan = plan_result.scalar_one_or_none()

    # Payment history (last 10)
    history_result = await db.execute(
        select(PaymentTransaction).where(
            PaymentTransaction.user_id == uid
        ).order_by(desc(PaymentTransaction.created_at)).limit(10)
    )
    history = []
    for tx in history_result.scalars():
        history.append({
            'id': str(tx.id),
            'date': tx.created_at.isoformat() if tx.created_at else None,
            'type': tx.transaction_type,
            'planId': tx.plan_id,
            'packId': tx.pack_id,
            'billingCycle': tx.billing_cycle,
            'coins': tx.coins_credited,
            'amountInr': float(tx.amount_inr) if tx.amount_inr else 0,
            'amountUsd': float(tx.amount_usd) if tx.amount_usd else 0,
            'currency': tx.currency,
            'status': tx.status,
        })

    return {
        'plan_id': plan_id,
        'plan_name': plan.display_name if plan else 'Free',
        'coins_balance': coins_balance,
        'topup_coins_balance': topup_balance,
        'total_coins': coins_balance + topup_balance,
        'coins_per_period': sub.coins_per_period if sub else (plan.coins_monthly if plan else 100),
        'period_start': (sub.period_start.isoformat() if sub and sub.period_start else None),
        'period_end': (sub.period_end.isoformat() if sub and sub.period_end else
                       (credit.billing_cycle_end.isoformat() if credit and credit.billing_cycle_end else None)),
        'status': sub.status if sub else 'active',
        'subscription_id': str(sub.id) if sub else None,
        'email': user.email,
        'payment_history': history,
    }


# ── Get catalog ──────────────────────────────────────
async def get_catalog(db: AsyncSession):
    """Return all active plans and top-up packs."""
    plans_result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.is_active == True).order_by(SubscriptionPlan.price_inr)
    )
    packs_result = await db.execute(
        select(TopUpPack).where(TopUpPack.is_active == True).order_by(TopUpPack.price_inr)
    )

    plans = []
    for p in plans_result.scalars():
        plans.append({
            'plan_id': p.plan_id,
            'display_name': p.display_name,
            'price_inr': float(p.price_inr),
            'price_usd': float(p.price_usd),
            'coins_monthly': p.coins_monthly,
            'resume_limit': p.resume_limit,
        })

    packs = []
    for pk in packs_result.scalars():
        packs.append({
            'pack_id': pk.pack_id,
            'display_name': pk.display_name,
            'price_inr': float(pk.price_inr),
            'price_usd': float(pk.price_usd),
            'coins': pk.coins,
        })

    return {'plans': plans, 'packs': packs}
