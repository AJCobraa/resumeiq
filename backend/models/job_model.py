"""
Pydantic models for the Job / Analysis schema.
"""
from pydantic import BaseModel
from typing import Optional


class Recommendation(BaseModel):
    recommendationId: str
    bulletId: str
    sectionId: str
    original: str
    recommended: str
    reason: str
    keyword: str
    status: str = "pending"  # pending | approved | edited | dismissed
    finalText: str = ""


class AnalyzeRequest(BaseModel):
    resumeId: str
    jdText: str
    jobUrl: str = ""
    jobPortal: str = "other"  # linkedin | naukri | indeed | internshala | other
    jobTitle: str = ""
    company: str = ""
    jobId: Optional[str] = None


class InterviewPrepItem(BaseModel):
    gap: str
    question: str
    strategicAnswer: str
    difficulty: str
    companyTier: Optional[str] = "standard"
    companyLabel: Optional[str] = "Tech Company"


class InterviewPrepResponse(BaseModel):
    interviewPrep: list[InterviewPrepItem]
    cached: bool
    generatedAt: Optional[str] = None
    companyTier: Optional[str] = "standard"
    companyLabel: Optional[str] = "Tech Company"


class UpdateJobStatusRequest(BaseModel):
    status: str  # saved | applied | interview | offer | rejected


class UpdateRecommendationRequest(BaseModel):
    recommendationId: str
    status: str  # approved | edited | dismissed
    finalText: str = ""
