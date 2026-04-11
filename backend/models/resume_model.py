"""
Pydantic models for the Resume schema.
These enforce the Firestore document structure at the application level.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Bullet(BaseModel):
    bulletId: str
    text: str = ""


class ExperienceSection(BaseModel):
    sectionId: str
    type: str = "experience"
    order: int
    company: str = ""
    role: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    bullets: list[Bullet] = []


class SkillCategory(BaseModel):
    categoryId: str
    label: str = ""
    items: list[str] = []


class SkillsSection(BaseModel):
    sectionId: str
    type: str = "skills"
    order: int
    categories: list[SkillCategory] = []


class ProjectItem(BaseModel):
    projectId: str
    name: str = ""
    institution: str = ""
    startDate: str = ""
    endDate: str = ""
    techStack: str = ""
    description: str = ""
    bullets: list[Bullet] = []


class ProjectsSection(BaseModel):
    sectionId: str
    type: str = "projects"
    order: int
    items: list[ProjectItem] = []


class EducationItem(BaseModel):
    eduId: str
    degree: str = ""
    institution: str = ""
    location: str = ""
    startYear: str = ""
    endYear: str = ""
    grade: str = ""


class EducationSection(BaseModel):
    sectionId: str
    type: str = "education"
    order: int
    items: list[EducationItem] = []


class CertificationItem(BaseModel):
    certId: str
    name: str = ""
    issuer: str = ""
    year: str = ""


class CertificationsSection(BaseModel):
    sectionId: str
    type: str = "certifications"
    order: int
    items: list[CertificationItem] = []


class AchievementsSection(BaseModel):
    sectionId: str
    type: str = "achievements"
    order: int
    bullets: list[Bullet] = []


class ResumeMeta(BaseModel):
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    blog: str = ""
    leetcode: str = ""
    summary: str = ""


class CreateResumeRequest(BaseModel):
    title: str
    templateId: Optional[str] = None


class UpdateMetaRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    blog: Optional[str] = None
    leetcode: Optional[str] = None
    summary: Optional[str] = None


class UpdateBulletRequest(BaseModel):
    sectionId: str
    bulletId: str
    text: str


class UpdateTemplateRequest(BaseModel):
    templateId: str


class ExportPDFRequest(BaseModel):
    templateId: Optional[str] = None
