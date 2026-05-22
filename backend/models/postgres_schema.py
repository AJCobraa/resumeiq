from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum, Boolean, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship
from pgvector.sqlalchemy import Vector
import uuid
import datetime
import enum

Base = declarative_base()

class PlanType(enum.Enum):
    free = "free"
    starter = "starter"
    pro = "pro"
    growth = "growth"

class User(Base):
    __tablename__ = 'users'

    uid = Column(String, primary_key=True)  # Matches Firebase Auth UID
    email = Column(String, nullable=False)
    display_name = Column(String, default="")
    photo_url = Column(String, default="")
    plan_type = Column(Enum(PlanType), default=PlanType.free)
    razorpay_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    credits = relationship("UserCredit", back_populates="user", uselist=False)
    transactions = relationship("CoinTransaction", back_populates="user")
    resumes = relationship("Resume", back_populates="user")
    jobs = relationship("Job", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    payment_transactions = relationship("PaymentTransaction", back_populates="user")

class UserCredit(Base):
    __tablename__ = 'user_credits'

    user_id = Column(String, ForeignKey('users.uid'), primary_key=True)
    coins_balance = Column(Integer, default=0, nullable=False)
    billing_cycle_end = Column(DateTime(timezone=True), nullable=True)
    coins_granted_this_period = Column(Integer, default=0, nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=True)
    ai_cost_usd_total = Column(Numeric, default=0.0, nullable=False)
    topup_coins_balance = Column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="credits")

class CoinTransaction(Base):
    __tablename__ = 'coin_transactions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.uid'), nullable=False)
    operation = Column(String, nullable=False)
    coins_charged = Column(Integer, nullable=False)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    actual_cost_usd = Column(Numeric, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="transactions")

class Resume(Base):
    __tablename__ = 'resumes'

    resume_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.uid'), nullable=False)
    resume_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="resumes")
    embeddings = relationship("ResumeEmbedding", back_populates="resume", cascade="all, delete-orphan")

class ResumeEmbedding(Base):
    __tablename__ = 'resume_embeddings'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(String, ForeignKey('resumes.resume_id'), nullable=False)
    chunk_id = Column(String, nullable=False)
    embedding = Column(Vector(3072), nullable=False)

    resume = relationship("Resume", back_populates="embeddings")

class Job(Base):
    __tablename__ = 'jobs'

    job_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.uid'), nullable=False)
    resume_id = Column(String, nullable=True) # Formal link to resume (nullable to preserve history)
    job_data = Column(JSONB, nullable=False)
    jd_embedding = Column(Vector(3072), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="jobs")


class SubscriptionPlan(Base):
    __tablename__ = 'subscription_plans'

    plan_id = Column(String, primary_key=True)  # free, starter, pro, growth
    display_name = Column(String, nullable=False)
    price_inr = Column(Numeric, nullable=False)  # monthly price in INR
    price_usd = Column(Numeric, nullable=False)  # monthly price in USD
    coins_monthly = Column(Integer, nullable=False)
    resume_limit = Column(Integer, nullable=True)  # NULL means unlimited
    is_active = Column(Boolean, default=True)


class Subscription(Base):
    __tablename__ = 'subscriptions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.uid'), nullable=False)
    plan_id = Column(String, ForeignKey('subscription_plans.plan_id'), nullable=False)
    billing_cycle = Column(String, nullable=False)  # monthly | quarterly | biannual
    status = Column(String, nullable=False, default='active')  # active | cancelled | expired | past_due
    coins_per_period = Column(Integer, nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    razorpay_sub_id = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="subscriptions")


class TopUpPack(Base):
    __tablename__ = 'topup_packs'

    pack_id = Column(String, primary_key=True)  # small | medium | large
    display_name = Column(String, nullable=False)
    price_inr = Column(Numeric, nullable=False)
    price_usd = Column(Numeric, nullable=False)
    coins = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)


class PaymentTransaction(Base):
    __tablename__ = 'payment_transactions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.uid'), nullable=False)
    transaction_type = Column(String, nullable=False)  # subscription_new | subscription_renewal | topup
    plan_id = Column(String, nullable=True)
    pack_id = Column(String, nullable=True)
    billing_cycle = Column(String, nullable=True)
    coins_credited = Column(Integer, nullable=False)
    amount_inr = Column(Numeric, nullable=False)
    amount_usd = Column(Numeric, nullable=False)
    currency = Column(String, nullable=False, default='INR')
    razorpay_order_id = Column(String, nullable=True, unique=True)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    razorpay_invoice_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default='pending')  # pending | success | failed | refunded
    failure_reason = Column(String, nullable=True)
    webhook_event_id = Column(String, nullable=True, unique=True)
    webhook_event_type = Column(String, nullable=True)
    webhook_status = Column(String, nullable=True)  # received | processed | ignored | error
    raw_webhook_json = Column(Text, nullable=True)
    metadata_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    user = relationship("User", back_populates="payment_transactions")
