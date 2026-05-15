"""
Pydantic models for billing, subscription, and payment endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateSubscriptionOrderRequest(BaseModel):
    plan_id: str
    billing_cycle: str  # monthly | quarterly | biannual
    currency: str = 'INR'


class CreateTopUpOrderRequest(BaseModel):
    pack_id: str
    currency: str = 'INR'


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: str
    plan_id: str
    billing_cycle: str
    status: str
    coins_per_period: int
    period_start: Optional[datetime]
    period_end: Optional[datetime]
    razorpay_sub_id: Optional[str]


class BillingStatusResponse(BaseModel):
    plan_id: str
    plan_name: str
    coins_balance: int
    topup_coins_balance: int
    total_coins: int
    coins_per_period: int
    period_start: Optional[datetime]
    period_end: Optional[datetime]
    status: str
    subscription_id: Optional[str]
    payment_history: list
