"""
Analysis pipeline — 3-layer process for resume-to-JD matching.
All data operations use PostgreSQL via AsyncSession.
"""
import uuid
import math
import hashlib
import re
import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.postgres_schema import Job, Resume, ResumeEmbedding
from services import embedding_service, gemma_service


def _now():
    return datetime.now(timezone.utc).isoformat()





def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _clean_url(url: str) -> str:
    if not url:
        return ""
    from urllib.parse import urlparse, urlunparse
    p = urlparse(url)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))





def _resume_to_text(resume: dict) -> str:
    lines = []
    meta = resume.get("meta", {})
    if meta.get("name"):
        lines.append(f"Name: {meta['name']}")
    if meta.get("title"):
        lines.append(f"Title: {meta['title']}")
    if meta.get("summary"):
        lines.append(f"Summary: {meta['summary']}")

    for section in sorted(resume.get("sections", []), key=lambda s: s.get("order", 0)):
        stype = section.get("type", "")
        if stype == "experience":
            lines.append("\n=== EXPERIENCE ===")
            lines.append(f"{section.get('role', '')} at {section.get('company', '')}")
            lines.append(f"{section.get('startDate', '')} - {section.get('endDate', '')}")
            for bullet in section.get("bullets", []):
                if bullet.get("text"):
                    lines.append(f"  • {bullet['text']}")
        elif stype == "education":
            lines.append("\n=== EDUCATION ===")
            for item in section.get("items", []):
                lines.append(f"{item.get('degree', '')} — {item.get('institution', '')}")
        elif stype == "skills":
            lines.append("\n=== SKILLS ===")
            for cat in section.get("categories", []):
                items = ", ".join(cat.get("items", []))
                lines.append(f"{cat.get('label', '')}: {items}")
        elif stype == "projects":
            lines.append("\n=== PROJECTS ===")
            for item in section.get("items", []):
                lines.append(f"{item.get('name', '')} [{item.get('techStack', '')}]")
                for bullet in item.get("bullets", []):
                    if bullet.get("text"):
                        lines.append(f"  • {bullet['text']}")

    return "\n".join(lines)


def _find_bullet_ids(resume: dict, current_text: str, rec_type: str = "") -> tuple[str, str]:
    """
    Find sectionId and bulletId (or categoryId) for a given text match.
    Now supports category labels for skills and professional summary matching.
    Uses fuzzy/substring matching for skill category labels.
    """
    normalized_target = _normalize_text(current_text).lower() if current_text else ""

    # 1. Handle Summary - Always map to meta/summary if type matches
    if rec_type in ["summary", "add_section"]:
        return "meta", "summary"

    # 2. Handle Sections
    for section in resume.get("sections", []):
        sid = section.get("sectionId", "")
        stype = section.get("type", "")

        # 2a. Skills: Match by Category Label or Fallback for 'add_skill'
        if stype == "skills" and rec_type in ["skills", "add_skill"]:
            # Pass 1: Exact label match
            for cat in section.get("categories", []):
                cat_label = _normalize_text(cat.get("label", "")).lower()
                if current_text and normalized_target == cat_label:
                    return sid, cat.get("categoryId", "")
            
            # Pass 2: Substring/fuzzy label match (handles "Programming Languages" vs "Languages")
            if current_text:
                for cat in section.get("categories", []):
                    cat_label = _normalize_text(cat.get("label", "")).lower()
                    if cat_label and (cat_label in normalized_target or normalized_target in cat_label):
                        return sid, cat.get("categoryId", "")
            
            # If it's an add_skill with no specific category yet, return the sectionId
            # and a 'new' sentinel if current_text is empty
            if rec_type == "add_skill" and not current_text:
                return sid, "new"

        # 2b. Experience/Projects: Match by Bullet Text
        if stype in ["experience", "projects"] and rec_type in ["experience", "projects", "rewrite_bullet", ""]:
            if not current_text:
                continue
                
            for bullet in section.get("bullets", []):
                if normalized_target == _normalize_text(bullet.get("text", "")).lower():
                    return sid, bullet.get("bulletId", "")
            
            for item in section.get("items", []):
                for bullet in item.get("bullets", []):
                    if normalized_target == _normalize_text(bullet.get("text", "")).lower():
                        return sid, bullet.get("bulletId", "")

    return "", ""


async def _find_existing_job(db: AsyncSession, user_id: str, jd_url: str, jd_hash: str) -> tuple:
    """Find existing job by hash or URL. Returns (Job row, dict data) or (None, None)."""
    try:
        if jd_hash:
            result = await db.execute(
                select(Job)
                .where(Job.user_id == user_id)
                .where(Job.job_data["jdHash"].astext == jd_hash)
                .limit(1)
            )
            row = result.scalar_one_or_none()
            if row:
                return row, row.job_data

        if jd_url:
            result = await db.execute(
                select(Job)
                .where(Job.user_id == user_id)
                .where(Job.job_data["jdUrl"].astext == jd_url)
                .limit(1)
            )
            row = result.scalar_one_or_none()
            if row:
                return row, row.job_data
    except Exception:
        pass
    return None, None


async def _get_resume_embeddings_from_db(db: AsyncSession, resume_id: str) -> list[dict]:
    """Read cached resume embeddings from the resume_embeddings table."""
    result = await db.execute(
        select(ResumeEmbedding).where(ResumeEmbedding.resume_id == resume_id)
    )
    rows = result.scalars().all()
    return [
        {"chunkId": r.chunk_id, "embedding": list(r.embedding)}
        for r in rows
    ]




async def analyze_resume_vs_jd(
    db: AsyncSession,
    user_id: str,
    resume_id: str,
    jd_text: str,
    jd_url: str = "",
    job_title: str = "",
    company: str = "",
    portal: str = "other",
    job_id: str | None = None,
) -> dict:
    from services import resume_service

    resume = await resume_service.get_resume(db, user_id, resume_id)
    if not resume:
        raise ValueError("Resume not found")

    resume_text = _resume_to_text(resume)
    jd_url = _clean_url(jd_url)
    normalized_jd_text = _normalize_text(jd_text)
    jd_hash = _md5(normalized_jd_text)

    existing_row = None
    existing_job = None
    cache_lookup_source = "none"
    if job_id:
        result = await db.execute(
            select(Job).where(Job.job_id == job_id, Job.user_id == user_id)
        )
        existing_row = result.scalar_one_or_none()
        if existing_row:
            existing_job = existing_row.job_data
            cache_lookup_source = "jobId"
    else:
        existing_row, existing_job = await _find_existing_job(db, user_id, jd_url, jd_hash)
        if existing_job:
            # Prevent catastrophic hash mismatches caused by URL falling back to same base LinkedIn URL.
            # Only allow it if jdHash matches!
            if existing_job.get("jdHash") == jd_hash:
                cache_lookup_source = "jdHash"
            else:
                # jdUrl matched, but the TEXT is completely different.
                # This means it's a completely different job selected on the same Search View URL!
                # We MUST NOT use this existing_job as a cache hit, otherwise we overwrite the old job in DB!
                existing_row = None
                existing_job = None
                cache_lookup_source = "none"

    # Resolve final_job_id early
    if job_id:
        final_job_id = job_id
    elif existing_job:
        final_job_id = existing_job.get("jobId")
    else:
        final_job_id = str(uuid.uuid4())

    # Cache hit detection: check Job.jd_embedding column
    jd_embedding = None
    is_jd_cache_hit = False
    if existing_row and existing_row.jd_embedding is not None:
        jd_embedding = list(existing_row.jd_embedding)
        is_jd_cache_hit = True

    # 1. Schedule concurrent tasks
    gemma_analysis_task = asyncio.create_task(
        gemma_service.analyze_resume_and_recommend(resume_text, jd_text, user_id=user_id)
    )

    chunks = await _get_resume_embeddings_from_db(db, resume_id)
    resume_emb_task = None
    if not chunks:
        resume_emb_task = asyncio.create_task(
            embedding_service.compute_embeddings(resume, user_id=user_id)
        )

    jd_emb_task = None
    if not is_jd_cache_hit:
        jd_emb_task = asyncio.create_task(
            embedding_service.get_jd_embedding(jd_text, user_id=user_id)
        )



    # 2. Await embeddings
    if resume_emb_task:
        chunks = await resume_emb_task
        await embedding_service.update_embeddings_cache(user_id, resume_id, resume)

    jd_embedding_computed = False
    if jd_emb_task:
        jd_embedding = await jd_emb_task
        jd_embedding_computed = True
    


    # 3. Compute semantic score (Single Vector Match)
    semantic_score = 0
    if chunks and jd_embedding is not None:
        best_sim = 0.0
        jd_norm = math.hypot(*jd_embedding)
        
        if jd_norm > 0:
            for chunk in chunks:
                emb = chunk.get("embedding", [])
                if emb is None or len(emb) == 0: continue
                
                c_norm = math.hypot(*emb)
                if c_norm > 0:
                    dot = sum(x * y for x, y in zip(emb, jd_embedding))
                    sim = dot / (c_norm * jd_norm)
                    if sim > best_sim:
                        best_sim = sim
        
        semantic_score = int(round(max(0.0, best_sim) * 100))



    # 4. Await Gemma analysis
    analysis_result = await gemma_analysis_task
    ats_score = analysis_result.get("atsScore", 0)
    breakdown = analysis_result.get("breakdown", {})
    missing_keywords = analysis_result.get("missingKeywords", [])
    strong_matches = analysis_result.get("strongMatches", [])
    raw_recs = analysis_result.get("recommendations", [])
    
    recommendations = []
    for rec in (raw_recs if isinstance(raw_recs, list) else []):
        current_text = rec.get("currentText", "")
        rec_type = rec.get("type", "experience")
        section_id, bullet_id = _find_bullet_ids(resume, current_text, rec_type)
        
        recommendations.append({
            "recommendationId": str(uuid.uuid4()),
            "type": rec_type,
            "sectionId": section_id,
            "bulletId": bullet_id,
            "currentText": current_text,
            "suggestedText": rec.get("suggestedText", ""),
            "reason": rec.get("reason", ""),
            "impact": rec.get("impact", "medium"),
            "keywordsAdded": rec.get("keywordsAdded", []),
            "status": "pending",
        })

    created_at = (existing_job or {}).get("createdAt") or _now()
    status = (existing_job or {}).get("status", "analyzed")
    initial_ats_score = (existing_job or {}).get("initialAtsScore", ats_score)

    job_doc = {
        "jobId": final_job_id,
        "userId": user_id,
        "resumeId": resume_id,
        "resumeTitle": resume.get("resumeTitle", "Untitled Resume"),
        "jobTitle": job_title,
        "company": company,
        "portal": portal,
        "jdUrl": jd_url,
        "jdText": jd_text[:5000],
        "jdHash": jd_hash,
        "isCacheHit": is_jd_cache_hit,
        "atsScore": ats_score,
        "initialAtsScore": initial_ats_score,
        "semanticScore": semantic_score,

        "breakdown": breakdown,
        "missingKeywords": missing_keywords,
        "strongMatches": strong_matches,
        "recommendations": recommendations,
        "status": status,
        "createdAt": created_at,
        "updatedAt": _now(),
        "debug": {
            "cacheLookupSource": cache_lookup_source,
            "jdEmbeddingCacheHit": is_jd_cache_hit,
            "jdEmbeddingComputed": jd_embedding_computed,
        },
    }

    # Upsert job into PostgreSQL
    if existing_row:
        existing_row.resume_id = resume_id
        existing_row.job_data = job_doc
        existing_row.jd_embedding = jd_embedding
    else:
        new_job = Job(
            job_id=final_job_id,
            user_id=user_id,
            resume_id=resume_id,
            job_data=job_doc,
            jd_embedding=jd_embedding,
        )
        db.add(new_job)

    await db.commit()
    return job_doc
