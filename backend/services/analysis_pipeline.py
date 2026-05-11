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


def _split_jd_into_sentences(text: str) -> list[str]:
    lines = re.split(r'\n+', text or "")
    sentences = []
    for line in lines:
        line = line.strip()
        parts = re.split(r'(?<=[.!?•▪️►➢])\s+', line)
        for p in parts:
            p = p.strip()
            # Filter out very short phrasing/headings to keep token counts & details focused.
            if len(p) > 25:
                sentences.append(p)
    return sentences[:50]  # Max 50 chunks for performance/limits



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


def _find_bullet_ids(resume: dict, current_text: str) -> tuple[str, str]:
    for section in resume.get("sections", []):
        sid = section.get("sectionId", "")

        if section.get("type") == "skills":
            for cat in section.get("categories", []):
                for item in cat.get("items", []):
                    if item == current_text:
                        return sid, cat.get("categoryId", "")

        for bullet in section.get("bullets", []):
            if bullet.get("text") == current_text:
                return sid, bullet.get("bulletId", "")
        for item in section.get("items", []):
            for bullet in item.get("bullets", []):
                if bullet.get("text") == current_text:
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

    cached_jd = existing_job if existing_job and existing_job.get("jdEmbeddingsCache") else None
    is_jd_cache_hit = cached_jd is not None

    semantic_score = 0

    # Read resume embeddings from the resume_embeddings table (Option A)
    chunks = await _get_resume_embeddings_from_db(db, resume_id)
    resume_embeddings_computed_on_demand = False

    jd_embedding_computed = False
    cached_reqs = []

    if is_jd_cache_hit:
        cached_reqs = cached_jd["jdEmbeddingsCache"].get("requirements", [])

    if is_jd_cache_hit and not cached_reqs:
        # Fallback if cache is somehow invalid
        is_jd_cache_hit = False

    # 1. Schedule the Gemma analysis task to run concurrently
    gemma_analysis_task = asyncio.create_task(
        gemma_service.analyze_resume_and_recommend(resume_text, jd_text, user_id=user_id)
    )

    # 2. Schedule embedding tasks if needed
    resume_emb_task = None
    if not chunks:
        resume_emb_task = asyncio.create_task(
            embedding_service.compute_embeddings(resume, user_id=user_id)
        )

    jd_emb_task = None
    sentences = []
    if not is_jd_cache_hit:
        sentences = _split_jd_into_sentences(jd_text)
        if not sentences:
            # Fallback if no valid sentences found
            sentences = [jd_text[:1000]]

        jd_emb_task = asyncio.create_task(
            embedding_service.get_jd_sentence_embeddings(sentences, user_id=user_id)
        )

    # 3. Await embedding tasks and compute semantic score
    if resume_emb_task:
        chunks = await resume_emb_task
        resume_embeddings_computed_on_demand = True
        # Write embeddings to resume_embeddings table.
        # Fire-and-forget — do not await, do not block analysis response.
        asyncio.ensure_future(
            embedding_service.update_embeddings_cache(user_id, resume_id, resume)
        )

    if jd_emb_task:
        sentence_embeddings = await jd_emb_task
        jd_embedding_computed = True

        cached_reqs = []
        for i, emb in enumerate(sentence_embeddings):
            if emb:
                cached_reqs.append({
                    "text": sentences[i],
                    "embedding": emb
                })

    semanticDetails = []
    if chunks and cached_reqs:
        all_best_scores = []

        # ⚡ Bolt Optimization: Precompute vector norms
        chunk_norms = []
        for chunk in chunks:
            emb = chunk.get("embedding", [])
            chunk_norms.append(math.hypot(*emb) if emb else 0.0)

        for req in cached_reqs:
            req_emb = req.get("embedding")
            if not req_emb:
                continue

            req_norm = math.hypot(*req_emb)
            if req_norm == 0.0:
                continue

            best_score = -1.0
            for i, chunk in enumerate(chunks):
                emb = chunk.get("embedding", [])
                c_norm = chunk_norms[i]
                if emb and c_norm > 0.0:
                    dot = sum(x * y for x, y in zip(emb, req_emb))
                    sim = dot / (c_norm * req_norm)
                    if sim > best_score:
                        best_score = sim

            score_clamped = max(0.0, best_score)
            all_best_scores.append(score_clamped)

            semanticDetails.append({
                "text": req.get("text", ""),
                "score": int(round(score_clamped * 100))
            })

        semantic_score = int(round((sum(all_best_scores) / len(all_best_scores)) * 100)) if all_best_scores else 0

    # 4. Await the Gemma analysis task
    analysis_result = await gemma_analysis_task
    ats_score = analysis_result.get("atsScore", 0)
    breakdown = analysis_result.get("breakdown", {})
    missing_keywords = analysis_result.get("missingKeywords", [])
    strong_matches = analysis_result.get("strongMatches", [])
    raw_recs = analysis_result.get("recommendations", [])
    recommendations = []
    for rec in (raw_recs if isinstance(raw_recs, list) else []):
        current_text = rec.get("currentText", "")
        section_id, bullet_id = _find_bullet_ids(resume, current_text)
        recommendations.append({
            "recommendationId": str(uuid.uuid4()),
            "type": rec.get("type", "rewrite_bullet"),
            "section": rec.get("section", ""),
            "sectionId": section_id,
            "bulletId": bullet_id,
            "currentText": current_text,
            "suggestedText": rec.get("suggestedText", ""),
            "reason": rec.get("reason", ""),
            "impact": rec.get("impact", "medium"),
            "keywordsAdded": rec.get("keywordsAdded", []),
            "status": "pending",
        })

    jd_embeddings_cache = None
    if jd_embedding_computed:
        jd_embeddings_cache = {
            "computedAt": _now(),
            "requirements": cached_reqs,
        }
    elif cached_jd:
        jd_embeddings_cache = cached_jd.get("jdEmbeddingsCache")

    if job_id:
        final_job_id = job_id
    elif existing_job:
        final_job_id = existing_job.get("jobId")
    else:
        final_job_id = str(uuid.uuid4())

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
        "jdEmbeddingsCache": jd_embeddings_cache,
        "isCacheHit": is_jd_cache_hit,
        "atsScore": ats_score,
        "initialAtsScore": initial_ats_score,
        "semanticScore": semantic_score,
        "semanticDetails": semanticDetails,
        "breakdown": breakdown,
        "missingKeywords": missing_keywords,
        "strongMatches": strong_matches,
        "recommendations": recommendations,
        "status": status,
        "createdAt": created_at,
        "updatedAt": _now(),
        "debug": {
            "cacheLookupSource": cache_lookup_source,
            "resolvedJobId": final_job_id,
            "matchedExistingJob": existing_job is not None,
            "hasJdEmbeddingsCache": cached_jd is not None,
            "jdEmbeddingComputed": jd_embedding_computed,
            "resumeEmbeddingsComputedOnDemand": resume_embeddings_computed_on_demand,
        },
    }

    # Upsert job into PostgreSQL
    if existing_row:
        existing_row.resume_id = resume_id
        existing_row.job_data = job_doc
    else:
        new_job = Job(
            job_id=final_job_id,
            user_id=user_id,
            resume_id=resume_id,
            job_data=job_doc,
        )
        db.add(new_job)

    await db.commit()

    return job_doc
