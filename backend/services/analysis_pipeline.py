"""
Analysis pipeline — 3-layer process for resume-to-JD matching.
"""
import uuid
import math
import hashlib
import re
from datetime import datetime, timezone
from firebase_admin_init import db
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


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


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


def _find_existing_job(user_id: str, jd_url: str, jd_hash: str) -> dict | None:
    try:
        jobs_ref = db.collection("users").document(user_id).collection("jobs")

        if jd_hash:
            hash_query = jobs_ref.where("jdHash", "==", jd_hash).limit(1).stream()
            for doc in hash_query:
                data = doc.to_dict()
                data["_docId"] = doc.id
                return data

        if jd_url:
            url_query = jobs_ref.where("jdUrl", "==", jd_url).limit(1).stream()
            for doc in url_query:
                data = doc.to_dict()
                data["_docId"] = doc.id
                return data
    except Exception:
        pass
    return None


async def analyze_resume_vs_jd(
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

    resume = await resume_service.get_resume(user_id, resume_id)
    if not resume:
        raise ValueError("Resume not found")

    resume_text = _resume_to_text(resume)
    jd_url = _clean_url(jd_url)
    normalized_jd_text = _normalize_text(jd_text)
    jd_hash = _md5(normalized_jd_text)

    existing_job = None
    cache_lookup_source = "none"
    if job_id:
        doc_ref = db.collection("users").document(user_id).collection("jobs").document(job_id)
        doc_snap = doc_ref.get()
        if doc_snap.exists:
            existing_job = doc_snap.to_dict()
            existing_job["_docId"] = doc_snap.id
            cache_lookup_source = "jobId"
    else:
        existing_job = _find_existing_job(user_id, jd_url, jd_hash)
        if existing_job:
            # Prevent catastrophic hash mismatches caused by URL falling back to same base LinkedIn URL.
            # Only allow it if jdHash matches!
            if existing_job.get("jdHash") == jd_hash:
                cache_lookup_source = "jdHash"
            else:
                # jdUrl matched, but the TEXT is completely different. 
                # This means it's a completely different job selected on the same Search View URL!
                # We MUST NOT use this existing_job as a cache hit, otherwise we overwrite the old job in DB!
                existing_job = None
                cache_lookup_source = "none"

    cached_jd = existing_job if existing_job and existing_job.get("jdEmbeddingsCache") else None
    is_jd_cache_hit = cached_jd is not None

    semantic_score = 0
    resume_cache = resume.get("embeddingsCache", {})
    chunks = resume_cache.get("chunks") or []
    resume_embeddings_computed_on_demand = False
    if not chunks:
        chunks = await embedding_service.compute_embeddings(resume, user_id=user_id)
        resume_embeddings_computed_on_demand = True

    jd_embedding = None
    req_embeddings = []
    jd_embedding_computed = False
    if is_jd_cache_hit:
        cached_reqs = cached_jd["jdEmbeddingsCache"].get("requirements", [])
        req_embeddings = [r.get("embedding") for r in cached_reqs if r.get("embedding")]
    else:
        jd_embedding = await embedding_service.get_jd_embedding(jd_text, user_id=user_id)
        jd_embedding_computed = True
        if jd_embedding:
            req_embeddings = [jd_embedding]

    if is_jd_cache_hit and not req_embeddings:
        jd_embedding = await embedding_service.get_jd_embedding(jd_text, user_id=user_id)
        jd_embedding_computed = True
        if jd_embedding:
            req_embeddings = [jd_embedding]
            is_jd_cache_hit = False

    if chunks and req_embeddings:
        all_best_scores = []
        for req_emb in req_embeddings:
            best_score = -1.0
            for chunk in chunks:
                emb = chunk.get("embedding", [])
                if emb:
                    sim = _cosine_similarity(emb, req_emb)
                    if sim > best_score:
                        best_score = sim
            all_best_scores.append(max(0.0, best_score))
        semantic_score = int(round((sum(all_best_scores) / len(all_best_scores)) * 100))

    ats_result = await gemma_service.score_ats(resume_text, jd_text, user_id=user_id)
    ats_score = ats_result.get("atsScore", 0)
    breakdown = ats_result.get("breakdown", {})
    missing_keywords = ats_result.get("missingKeywords", [])
    strong_matches = ats_result.get("strongMatches", [])

    raw_recs = await gemma_service.generate_recommendations(
        resume_text, jd_text, missing_keywords, ats_score, user_id=user_id
    )
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
    if jd_embedding:
        jd_embeddings_cache = {
            "computedAt": _now(),
            "requirements": [{"text": jd_text[:500], "embedding": jd_embedding}],
        }
    elif cached_jd:
        jd_embeddings_cache = cached_jd.get("jdEmbeddingsCache")

    if job_id:
        final_job_id = job_id
    elif existing_job:
        final_job_id = existing_job.get("jobId") or existing_job.get("_docId")
    else:
        final_job_id = str(uuid.uuid4())

    created_at = (existing_job or {}).get("createdAt") or _now()
    status = (existing_job or {}).get("status", "analyzed")

    job_doc = {
        "jobId": final_job_id,
        "userId": user_id,
        "resumeId": resume_id,
        "jobTitle": job_title,
        "company": company,
        "portal": portal,
        "jdUrl": jd_url,
        "jdText": jd_text[:5000],
        "jdHash": jd_hash,
        "jdEmbeddingsCache": jd_embeddings_cache,
        "isCacheHit": is_jd_cache_hit,
        "atsScore": ats_score,
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
            "resolvedJobId": final_job_id,
            "matchedExistingJob": existing_job is not None,
            "hasJdEmbeddingsCache": cached_jd is not None,
            "jdEmbeddingComputed": jd_embedding_computed,
            "resumeEmbeddingsComputedOnDemand": resume_embeddings_computed_on_demand,
        },
    }

    db.collection("users").document(user_id).collection("jobs").document(final_job_id).set(job_doc)
    return job_doc
