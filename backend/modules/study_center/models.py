"""
Study Center ORM Models.

These models extend the shared Base from postgres_schema so they are
auto-created by Base.metadata.create_all in main.py's startup event.

Hard isolation: imports ONLY from core/ and models.postgres_schema.
Zero cross-module imports.
"""
import uuid
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, DateTime, ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from models.postgres_schema import Base


class Course(Base):
    __tablename__ = "courses"

    course_id = Column(String, primary_key=True)  # e.g. "system-design"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    tags = Column(JSONB, default=list)
    is_active = Column(Boolean, default=True)
    coin_cost = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Chapter(Base):
    __tablename__ = "chapters"

    chapter_id = Column(String, primary_key=True)  # e.g. "sd-02"
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    title = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    filename = Column(String, nullable=False)  # e.g. "02-scale-from-zero.md"
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False)
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    status = Column(String, default="active")  # active / expired / cancelled
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # null = lifetime
    coins_paid = Column(Integer, default=0)


class ChapterProgress(Base):
    __tablename__ = "chapter_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.uid"), nullable=False)
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    chapter_id = Column(String, ForeignKey("chapters.chapter_id"), nullable=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
