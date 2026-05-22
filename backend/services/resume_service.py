"""
Resume PostgreSQL service — all database operations for resumes.
Handles CRUD, section management, and data serialization via JSONB.
Used by AI services for context generation.

All data stored in `resumes.resume_data` JSONB column.
"""
import copy
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm.attributes import flag_modified
from models.postgres_schema import Resume, Job
from models.resume_model import ResumeMeta


def _now():
    return datetime.now(timezone.utc).isoformat()


def _make_blank_resume(uid: str, title: str, template_id: str = "cobra") -> dict:
    """Generate a blank resume document with default sections."""
    resume_id = str(uuid.uuid4())
    return resume_id, {
        "resumeId": resume_id,
        "userId": uid,
        "resumeTitle": title,
        "templateId": template_id,
        "meta": ResumeMeta().model_dump(),
        "sections": [
            {
                "sectionId": str(uuid.uuid4()),
                "type": "experience",
                "order": 0,
                "company": "",
                "role": "",
                "location": "",
                "startDate": "",
                "endDate": "",
                "current": False,
                "bullets": [
                    {"bulletId": str(uuid.uuid4()), "text": ""}
                ],
            },
            {
                "sectionId": str(uuid.uuid4()),
                "type": "skills",
                "order": 1,
                "categories": [
                    {"categoryId": str(uuid.uuid4()), "label": "Languages", "items": []},
                    {"categoryId": str(uuid.uuid4()), "label": "Frameworks", "items": []},
                ],
            },
            {
                "sectionId": str(uuid.uuid4()),
                "type": "education",
                "order": 2,
                "items": [
                    {
                        "eduId": str(uuid.uuid4()),
                        "degree": "",
                        "institution": "",
                        "location": "",
                        "startYear": "",
                        "endYear": "",
                        "grade": "",
                    }
                ],
            },
            {
                "sectionId": str(uuid.uuid4()),
                "type": "projects",
                "order": 3,
                "items": [
                    {
                        "projectId": str(uuid.uuid4()),
                        "name": "",
                        "institution": "",
                        "startDate": "",
                        "endDate": "",
                        "techStack": "",
                        "description": "",
                        "bullets": [
                            {"bulletId": str(uuid.uuid4()), "text": ""}
                        ],
                    }
                ],
            },
        ],
        "isBase": True,
        "createdAt": _now(),
        "updatedAt": _now(),
    }


async def create_resume(db: AsyncSession, uid: str, title: str, template_id: str = "cobra") -> dict:
    """Create a new blank resume for the user."""
    resume_id, data = _make_blank_resume(uid, title, template_id)
    row = Resume(
        resume_id=resume_id,
        user_id=uid,
        resume_data=data,
        is_base=True,
    )
    db.add(row)
    await db.commit()
    return data


async def create_resume_from_parsed(db: AsyncSession, uid: str, parsed: dict, title: str = "Imported Resume", template_id: str = "cobra") -> dict:
    """
    Create a resume populated from Gemma-parsed PDF data.
    `parsed` must contain `meta` and `sections` keys matching the schema.
    UUIDs are generated server-side for all IDs.
    """
    resume_id = str(uuid.uuid4())

    # Build meta from parsed data, with defaults
    raw_meta = parsed.get("meta", {})
    meta = {
        "name": raw_meta.get("name", ""),
        "email": raw_meta.get("email", ""),
        "phone": raw_meta.get("phone", ""),
        "location": raw_meta.get("location", ""),
        "title": raw_meta.get("title", ""),
        "summary": raw_meta.get("summary", ""),
        "linkedin": raw_meta.get("linkedin", ""),
        "github": raw_meta.get("github", ""),
        "website": raw_meta.get("website", ""),
    }

    # Inject server-generated UUIDs into all nested objects
    sections = []
    for i, sec in enumerate(parsed.get("sections", [])):
        stype = sec.get("type", "")
        section_base = {"sectionId": str(uuid.uuid4()), "type": stype, "order": i}

        if stype == "experience":
            bullets = [
                {"bulletId": str(uuid.uuid4()), "text": b.get("text", "") if isinstance(b, dict) else str(b)}
                for b in sec.get("bullets", [])
            ]
            sections.append({
                **section_base,
                "company": sec.get("company", ""),
                "role": sec.get("role", ""),
                "location": sec.get("location", ""),
                "startDate": sec.get("startDate", ""),
                "endDate": sec.get("endDate", ""),
                "current": sec.get("current", False),
                "bullets": bullets,
            })

        elif stype == "skills":
            categories = [
                {
                    "categoryId": str(uuid.uuid4()),
                    "label": cat.get("label", ""),
                    "items": cat.get("items", []),
                }
                for cat in sec.get("categories", [])
            ]
            sections.append({**section_base, "categories": categories})

        elif stype == "education":
            items = []
            for item in sec.get("items", []):
                items.append({
                    "eduId": str(uuid.uuid4()),
                    "degree": item.get("degree", ""),
                    "institution": item.get("institution", ""),
                    "location": item.get("location", ""),
                    "startYear": item.get("startYear", ""),
                    "endYear": item.get("endYear", ""),
                    "grade": item.get("grade", ""),
                })
            sections.append({**section_base, "items": items})

        elif stype == "projects":
            items = []
            for item in sec.get("items", []):
                bullets = [
                    {"bulletId": str(uuid.uuid4()), "text": b.get("text", "") if isinstance(b, dict) else str(b)}
                    for b in item.get("bullets", [])
                ]
                items.append({
                    "projectId": str(uuid.uuid4()),
                    "name": item.get("name", ""),
                    "institution": item.get("institution", ""),
                    "startDate": item.get("startDate", ""),
                    "endDate": item.get("endDate", ""),
                    "techStack": item.get("techStack", ""),
                    "description": item.get("description", ""),
                    "bullets": bullets,
                })
            sections.append({**section_base, "items": items})

    data = {
        "resumeId": resume_id,
        "userId": uid,
        "resumeTitle": title,
        "templateId": template_id,
        "meta": meta,
        "sections": sections,
        "isBase": True,
        "createdAt": _now(),
        "updatedAt": _now(),
    }

    row = Resume(
        resume_id=resume_id,
        user_id=uid,
        resume_data=data,
        is_base=True,
    )
    db.add(row)
    await db.commit()
    return data


async def list_resumes(db: AsyncSession, uid: str) -> list[dict]:
    """List all resumes for a user (returns full data for thumbnail render)."""
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == uid)
        .order_by(Resume.updated_at.desc())
    )
    rows = result.scalars().all()
    results = []
    for row in rows:
        d = row.resume_data or {}
        results.append({
            "resumeId":    d.get("resumeId"),
            "resumeTitle": d.get("resumeTitle", "Untitled"),
            "templateId":  d.get("templateId", "cobra"),
            "meta":        d.get("meta", {}),
            "sections":    d.get("sections", []),
            "isBase":      row.is_base if row.is_base is not None else True,
            "sourceResumeId": row.source_resume_id,
            "updatedAt":   d.get("updatedAt"),
            "createdAt":   d.get("createdAt"),
        })
    return results


async def get_resume(db: AsyncSession, uid: str, resume_id: str) -> dict | None:
    """Get a full resume document."""
    result = await db.execute(
        select(Resume).where(Resume.resume_id == resume_id, Resume.user_id == uid)
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    
    data = dict(row.resume_data)
    # Backwards compatibility: inject column values if missing from JSONB
    if "isBase" not in data:
        data["isBase"] = row.is_base if row.is_base is not None else True
    if "sourceResumeId" not in data:
        data["sourceResumeId"] = row.source_resume_id
        
    return data


async def _get_resume_row(db: AsyncSession, uid: str, resume_id: str) -> Resume | None:
    """Get the raw Resume ORM row for updates."""
    result = await db.execute(
        select(Resume).where(Resume.resume_id == resume_id, Resume.user_id == uid)
    )
    return result.scalar_one_or_none()


async def update_meta(db: AsyncSession, uid: str, resume_id: str, updates: dict) -> dict:
    """Patch resume meta fields (partial update)."""
    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return None

    data = dict(row.resume_data)  # Make a mutable copy
    meta = dict(data.get("meta", {}))
    for key, val in updates.items():
        if val is not None:
            meta[key] = val
    data["meta"] = meta
    data["updatedAt"] = _now()

    row.resume_data = data
    flag_modified(row, "resume_data")
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return data


async def update_sections(db: AsyncSession, uid: str, resume_id: str, sections: list[dict]) -> dict:
    """Replace the entire sections array (used by the editor's save)."""
    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return None

    data = dict(row.resume_data)
    data["sections"] = sections
    data["updatedAt"] = _now()

    row.resume_data = data
    flag_modified(row, "resume_data")
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return data


async def update_bullet(db: AsyncSession, uid: str, resume_id: str, section_id: str, bullet_id: str, text: str) -> dict:
    """Update a single bullet's text within a section."""
    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return None

    data = dict(row.resume_data)
    sections = data.get("sections", [])

    for section in sections:
        if section.get("sectionId") == section_id:
            # Handle sections with direct bullets (experience, achievements)
            for bullet in section.get("bullets", []):
                if bullet.get("bulletId") == bullet_id:
                    bullet["text"] = text
                    data["updatedAt"] = _now()
                    row.resume_data = data
                    flag_modified(row, "resume_data")
                    row.updated_at = datetime.now(timezone.utc)
                    await db.commit()
                    return data
            # Handle sections with items containing bullets (projects)
            for item in section.get("items", []):
                for bullet in item.get("bullets", []):
                    if bullet.get("bulletId") == bullet_id:
                        bullet["text"] = text
                        data["updatedAt"] = _now()
                        row.resume_data = data
                        flag_modified(row, "resume_data")
                        row.updated_at = datetime.now(timezone.utc)
                        await db.commit()
                        return data

    return None


async def update_template(db: AsyncSession, uid: str, resume_id: str, template_id: str) -> dict:
    """Update the template ID for a resume."""
    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return None

    data = dict(row.resume_data)
    data["templateId"] = template_id
    data["updatedAt"] = _now()

    row.resume_data = data
    flag_modified(row, "resume_data")
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return data


async def update_resume_title(db: AsyncSession, uid: str, resume_id: str, title: str) -> dict:
    """Update the resume title."""
    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return None

    data = dict(row.resume_data)
    data["resumeTitle"] = title
    data["updatedAt"] = _now()

    row.resume_data = data
    flag_modified(row, "resume_data")
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return data


async def delete_resume(db: AsyncSession, uid: str, resume_id: str) -> bool:
    """
    Delete a resume.
    Instead of cascade-deleting jobs, mark all affected jobs with
    resumeTitle='__deleted__' so the UI can show a deleted state
    while preserving all analysis history.

    Explicitly deletes child resume_embeddings rows BEFORE the resume
    to avoid FK constraint violations and AsyncSession lazy-loading
    issues (MissingGreenlet) with ORM-level cascades.
    """
    from models.postgres_schema import ResumeEmbedding

    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return False

    # Mark all jobs that used this resume as having a deleted resume
    jobs_result = await db.execute(
        select(Job).where(Job.user_id == uid, Job.resume_id == resume_id)
    )
    for job_row in jobs_result.scalars().all():
        job_data = dict(job_row.job_data or {})
        job_data["resumeTitle"] = "__deleted__"
        job_row.job_data = job_data
        flag_modified(job_row, "job_data")

    # Explicitly delete child embeddings to avoid FK constraint violation
    # (AsyncSession cannot lazy-load the ORM cascade relationship)
    await db.execute(
        delete(ResumeEmbedding).where(ResumeEmbedding.resume_id == resume_id)
    )

    await db.delete(row)
    await db.commit()
    return True


def summarize_resume(data: dict) -> str:
    """
    Summarize resume data into a compact text format for AI context.
    Focuses on role, summary, and experience highlights.
    """
    meta = data.get("meta") or {}
    summary = [
        f"Name: {meta.get('name')}",
        f"Title: {meta.get('title')}",
        f"Summary: {meta.get('summary')}",
        "\nExperience:",
    ]

    for sec in data.get("sections", []):
        if sec.get("type") == "experience":
            summary.append(f"- {sec.get('role')} at {sec.get('company')}")
            for b in sec.get("bullets", [])[:2]:  # Top 2 bullets only
                summary.append(f"  * {b.get('text')}")

    return "\n".join(summary)


async def duplicate_resume_for_tailoring(db: AsyncSession, uid: str, resume_id: str, new_title: str) -> dict:
    """
    Clone a base resume for job-specific tailoring.

    CRITICAL CONTRACT:
    - New top-level resumeId is generated (uuid4)
    - meta.title and resumeTitle updated to new_title
    - isBase set to False in both JSONB and ORM column
    - source_resume_id set to original resume_id (lineage tracking)
    - ALL internal sectionId and bulletId values PRESERVED EXACTLY
    - Timestamps (createdAt, updatedAt) reset to now
    - Embeddings are NOT copied (will be generated fresh by background task)
    """
    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return None

    new_resume_id = str(uuid.uuid4())
    new_data = copy.deepcopy(dict(row.resume_data))

    # Only mutate top-level identity — leave all sectionId/bulletId untouched
    new_data["resumeId"] = new_resume_id
    if "meta" in new_data:
        new_data["meta"]["title"] = new_title
    new_data["resumeTitle"] = new_title
    new_data["isBase"] = False
    new_data["createdAt"] = _now()
    new_data["updatedAt"] = _now()

    new_row = Resume(
        resume_id=new_resume_id,
        user_id=uid,
        resume_data=new_data,
        is_base=False,
        source_resume_id=resume_id,
    )
    db.add(new_row)
    await db.commit()
    return new_data


async def toggle_base_status(db: AsyncSession, uid: str, resume_id: str, is_base: bool) -> dict:
    """
    Toggle is_base on both the DB column and inside resume_data JSONB.
    Both must stay in sync at all times.
    """
    row = await _get_resume_row(db, uid, resume_id)
    if not row:
        return None

    row.is_base = is_base
    data = dict(row.resume_data)
    data["isBase"] = is_base
    data["updatedAt"] = _now()
    row.resume_data = data
    flag_modified(row, "resume_data")
    await db.commit()
    return data
