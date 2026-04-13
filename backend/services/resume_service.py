"""
Resume Firestore service — all database operations for resumes.
Handles CRUD, section management, and data serialization for Firestore.
Used by AI services for context generation.
"""
import uuid
from datetime import datetime, timezone
from firebase_admin_init import db
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
        "createdAt": _now(),
        "updatedAt": _now(),
    }


def _resume_ref(uid: str, resume_id: str):
    """Get Firestore document reference for a specific resume."""
    return db.collection("users").document(uid).collection("resumes").document(resume_id)


async def create_resume(uid: str, title: str, template_id: str = "cobra") -> dict:
    """Create a new blank resume for the user."""
    resume_id, data = _make_blank_resume(uid, title, template_id)
    _resume_ref(uid, resume_id).set(data)
    return data


async def create_resume_from_parsed(uid: str, parsed: dict, title: str = "Imported Resume", template_id: str = "cobra") -> dict:
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
        "createdAt": _now(),
        "updatedAt": _now(),
    }

    _resume_ref(uid, resume_id).set(data)
    return data


async def list_resumes(uid: str) -> list[dict]:
    """List all resumes for a user (summary fields only)."""
    docs = (
        db.collection("users")
        .document(uid)
        .collection("resumes")
        .order_by("updatedAt", direction="DESCENDING")
        .stream()
    )
    results = []
    for doc in docs:
        d = doc.to_dict()
        results.append({
            "resumeId":    d.get("resumeId"),
            "resumeTitle": d.get("resumeTitle", "Untitled"),
            "templateId":  d.get("templateId", "cobra"),
            "meta":        d.get("meta", {}),        # return full meta — needed for thumbnail render
            "sections":    d.get("sections", []),    # return full sections — needed for thumbnail render
            "updatedAt":   d.get("updatedAt"),
            "createdAt":   d.get("createdAt"),
        })
    return results


async def get_resume(uid: str, resume_id: str) -> dict | None:
    """Get a full resume document."""
    doc = _resume_ref(uid, resume_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


async def update_meta(uid: str, resume_id: str, updates: dict) -> dict:
    """Patch resume meta fields (partial update)."""
    ref = _resume_ref(uid, resume_id)
    doc = ref.get()
    if not doc.exists:
        return None

    # Build field-level update to avoid overwriting entire meta
    patch = {"updatedAt": _now()}
    for key, val in updates.items():
        if val is not None:
            patch[f"meta.{key}"] = val

    ref.update(patch)
    return (await get_resume(uid, resume_id))


async def update_sections(uid: str, resume_id: str, sections: list[dict]) -> dict:
    """Replace the entire sections array (used by the editor's auto-save)."""
    ref = _resume_ref(uid, resume_id)
    doc = ref.get()
    if not doc.exists:
        return None

    ref.update({"sections": sections, "updatedAt": _now()})
    return (await get_resume(uid, resume_id))


async def update_bullet(uid: str, resume_id: str, section_id: str, bullet_id: str, text: str) -> dict:
    """Update a single bullet's text within a section."""
    ref = _resume_ref(uid, resume_id)
    doc = ref.get()
    if not doc.exists:
        return None

    data = doc.to_dict()
    sections = data.get("sections", [])

    for section in sections:
        if section.get("sectionId") == section_id:
            # Handle sections with direct bullets (experience, achievements)
            for bullet in section.get("bullets", []):
                if bullet.get("bulletId") == bullet_id:
                    bullet["text"] = text
                    ref.update({"sections": sections, "updatedAt": _now()})
                    return (await get_resume(uid, resume_id))
            # Handle sections with items containing bullets (projects)
            for item in section.get("items", []):
                for bullet in item.get("bullets", []):
                    if bullet.get("bulletId") == bullet_id:
                        bullet["text"] = text
                        ref.update({"sections": sections, "updatedAt": _now()})
                        return (await get_resume(uid, resume_id))

    return None


async def update_template(uid: str, resume_id: str, template_id: str) -> dict:
    """Update the template ID for a resume."""
    ref = _resume_ref(uid, resume_id)
    doc = ref.get()
    if not doc.exists:
        return None

    ref.update({"templateId": template_id, "updatedAt": _now()})
    return (await get_resume(uid, resume_id))


async def update_resume_title(uid: str, resume_id: str, title: str) -> dict:
    """Update the resume title."""
    ref = _resume_ref(uid, resume_id)
    doc = ref.get()
    if not doc.exists:
        return None

    ref.update({"resumeTitle": title, "updatedAt": _now()})
    return (await get_resume(uid, resume_id))


async def delete_resume(uid: str, resume_id: str) -> bool:
    """
    Delete a resume.
    Instead of cascade-deleting jobs, mark all affected jobs with
    resumeTitle='__deleted__' so the UI can show a deleted state
    while preserving all analysis history.
    """
    ref = _resume_ref(uid, resume_id)
    doc = ref.get()
    if not doc.exists:
        return False

    # Mark all jobs that used this resume as having a deleted resume
    jobs_ref = db.collection("users").document(uid).collection("jobs")
    jobs = jobs_ref.where("resumeId", "==", resume_id).stream()
    for job in jobs:
        job.reference.update({"resumeTitle": "__deleted__"})

    ref.delete()
    return True


def summarize_resume(data: dict) -> str:
    """
    Summarize resume data into a compact text format for AI context.
    Focuses on role, summary, and experience highlights.
    """
    meta = data.get("meta", {})
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
