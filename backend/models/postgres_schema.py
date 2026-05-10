from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum, text
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

    uid = Column(String, primary_key=True) # Matches Firebase Auth UID
    email = Column(String, nullable=False)
    plan_type = Column(Enum(PlanType), default=PlanType.free)
    razorpay_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    credits = relationship("UserCredit", back_populates="user", uselist=False)
    transactions = relationship("CoinTransaction", back_populates="user")
    resumes = relationship("Resume", back_populates="user")
    jobs = relationship("Job", back_populates="user")

class UserCredit(Base):
    __tablename__ = 'user_credits'

    user_id = Column(String, ForeignKey('users.uid'), primary_key=True)
    coins_balance = Column(Integer, default=0, nullable=False)
    billing_cycle_end = Column(DateTime, nullable=True)

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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="transactions")

class Resume(Base):
    __tablename__ = 'resumes'

    resume_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.uid'), nullable=False)
    resume_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

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
    job_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="jobs")
    embeddings = relationship("JDEmbedding", back_populates="job", cascade="all, delete-orphan")

class JDEmbedding(Base):
    __tablename__ = 'jd_embeddings'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String, ForeignKey('jobs.job_id'), nullable=False)
    sentence_idx = Column(Integer, nullable=False)
    embedding = Column(Vector(3072), nullable=False)

    job = relationship("Job", back_populates="embeddings")
