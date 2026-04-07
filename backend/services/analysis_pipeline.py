"""
Analysis pipeline — 3-layer process for resume-to-JD matching.

Layer 1: Embedding similarity (semantic matching via text-embedding-004)
Layer 2: ATS scoring (keyword + section analysis via Gemma)
Layer 3: Recommendation generation (bullet rewrites via Gemma)

This pipeline is triggered by POST /api/analyze.

JD CACHING (Section 18.1):
  - Computes MD5 hash of jdText on every analysis call
  - Checks if a job with same jdUrl AND jdHash already exists for this user
  - If found with jdEmbeddingsCache, skips JD parsing+embedding (uses cached data)
  - Saves jdEmbeddingsCache to new job docs for future reuse

RECOMMENDATION FIX (Section 19.2):
  - Each recommendation now includes sectionId + bulletId for precise bullet targeting
  - This allows the approval logic to update bullets by ID instead of text matching
"""
import uuid
import math
import hashlib
from datetime import datetime, timezone
from firebase_admin_init import db
from services import embedding_service, gemma_service


def _now():
    return datetime.now(timezone.utc).isoformat()


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _resume_to_text(resume: dict) -> str:
    """Convert resume to flat text for Gemma prompt context."""
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
            lines.append(f"\n=== EXPERIENCE ===")
            lines.append(f"{section.get('role', '')} at {section.get('company', '')}")
            lines.append(f"{section.get('startDate', '')} - {section.get('endDate', '')}")
            for b in section.get("bullets", []):
                if b.get("text"):
                    lines.append(f"  • {b['text']}")

        elif stype == "education":
            lines.append(f"\n=== EDUCATION ===")
            for item in section.get("items", []):
                lines.append(f"{item.get('degree', '')} — {item.get('institution', '')}")

        elif stype == "skills":
            lines.append(f"\n=== SKILLS ===")
            for cat in section.get("categories", []):
                items = ", ".join(cat.get("items", []))
                lines.append(f"{cat.get('label', '')}: {items}")

        elif stype == "projects":
            lines.append(f"\n=== PROJECTS ===")
            for item in section.get("items", []):
                lines.append(f"{item.get('name', '')} [{item.get('techStack', '')}]")
                for b in item.get("bullets", []):
                    if b.get("text"):
                        lines.append(f"  • {b['text']}")

    return "\n".join(lines)


def _find_bullet_ids(resume: dict, current_text: str) -> tuple[str, str]:
    """
    Given the currentText of a recommendation, find its sectionId and bulletId.
    Returns ("", "") if not found.
    """
    for section in resume.get("sections", []):
        sid = section.get("sectionId", "")
        for bullet in section.get("bullets", []):
            if bullet.get("text") == current_text:
                return sid, bullet.get("bulletId", "")
        for item in section.get("items", []):
            for bullet in item.get("bullets", []):
                if bullet.get("text") == current_text:
                    return sid, bullet.get("bulletId", "")
    return "", ""


def _check_jd_cache(user_id: str, jd_url: str, jd_hash: str) -> dict | None:
    """
    Query Firestore for an existing job with the same URL and JD hash for this user.
    Returns the job doc if found with a valid jdEmbeddingsCache, else None.
    """
    try:
        if not jd_url:
            return None
        query = (
            db.collection("users")
            .document(user_id)
            .collection("jobs")
            .where("jdUrl", "==", jd_url)
            .where("jdHash", "==", jd_hash)
            .limit(1)
            .stream()
        )
        for doc in query:
            data = doc.to_dict()
            if data.get("jdEmbeddingsCache"):
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
) -> dict:
    """
    Run the full 3-layer analysis pipeline.

    Returns the created job document with:
      - atsScore, breakdown
      - semanticScore (embedding similarity)
      - recommendations (with sectionId + bulletId for precise targeting)
      - missingKeywords, strongMatches
      - jdHash, jdEmbeddingsCache (for future cache hits)
    """
    # ── Load resume ──────────────────────────────────
    from services import resume_service
    resume = await resume_service.get_resume(user_id, resume_id)
    if not resume:
        raise ValueError("Resume not found")

    resume_text = _resume_to_text(resume)

    # ── JD Cache Check ───────────────────────────────
    jd_hash = _md5(jd_text)
    cached_jd = _check_jd_cache(user_id, jd_url, jd_hash)
    is_jd_cache_hit = cached_jd is not None

    # ── Layer 1: Semantic Similarity ─────────────────
    semantic_score = 0.0
    resume_cache = resume.get("embeddingsCache", {})
    chunks = resume_cache.get("chunks", [])

    if chunks:
        if is_jd_cache_hit:
            # Reuse the cached JD embedding (first requirement embedding as proxy)
            cached_reqs = cached_jd["jdEmbeddingsCache"].get("requirements", [])
            if cached_reqs:
                jd_embedding = cached_reqs[0].get("embedding", [])
            else:
                jd_embedding = await embedding_service.get_jd_embedding(jd_text, user_id=user_id)
        else:
            jd_embedding = await embedding_service.get_jd_embedding(jd_text, user_id=user_id)

        if jd_embedding:
            similarities = []
            for chunk in chunks:
                emb = chunk.get("embedding", [])
                if emb:
                    sim = _cosine_similarity(emb, jd_embedding)
                    similarities.append(sim)
            if similarities:
                semantic_score = round(sum(similarities) / len(similarities) * 100, 1)

    # ── Layer 2: ATS Scoring ─────────────────────────
    ats_result = await gemma_service.score_ats(resume_text, jd_text, user_id=user_id)
    ats_score = ats_result.get("atsScore", 0)
    breakdown = ats_result.get("breakdown", {})
    missing_keywords = ats_result.get("missingKeywords", [])
    strong_matches = ats_result.get("strongMatches", [])

    # ── Layer 3: Recommendations ─────────────────────
    raw_recs = await gemma_service.generate_recommendations(
        resume_text, jd_text, missing_keywords, ats_score, user_id=user_id
    )

    recommendations = []
    for r in (raw_recs if isinstance(raw_recs, list) else []):
        current_text = r.get("currentText", "")
        # Find sectionId and bulletId for precise bullet targeting (Bug Fix 19.2)
        section_id, bullet_id = _find_bullet_ids(resume, current_text)
        recommendations.append({
            "recommendationId": str(uuid.uuid4()),
            "type": r.get("type", "rewrite_bullet"),
            "section": r.get("section", ""),
            "sectionId": section_id,   # NEW — enables ID-based bullet targeting
            "bulletId": bullet_id,     # NEW — enables ID-based bullet targeting
            "currentText": current_text,
            "suggestedText": r.get("suggestedText", ""),
            "reason": r.get("reason", ""),
            "impact": r.get("impact", "medium"),
            "keywordsAdded": r.get("keywordsAdded", []),
            "status": "pending",  # pending | approved | dismissed
        })

    # ── Build JD Embeddings Cache ────────────────────
    jd_embeddings_cache = None
    if not is_jd_cache_hit and 'jd_embedding' in locals() and jd_embedding:
        jd_embeddings_cache = {
            "computedAt": _now(),
            "requirements": [{"text": jd_text[:500], "embedding": jd_embedding}],
        }
    elif is_jd_cache_hit:
        jd_embeddings_cache = cached_jd.get("jdEmbeddingsCache")

    # ── Save job document ────────────────────────────
    job_id = str(uuid.uuid4())
    job_doc = {
        "jobId": job_id,
        "userId": user_id,
        "resumeId": resume_id,
        "jobTitle": job_title,
        "company": company,
        "portal": portal,
        "jdUrl": jd_url,
        "jdText": jd_text[:5000],  # cap at 5KB
        "jdHash": jd_hash,
        "jdEmbeddingsCache": jd_embeddings_cache,
        "isCacheHit": is_jd_cache_hit,
        "atsScore": ats_score,
        "semanticScore": semantic_score,
        "breakdown": breakdown,
        "missingKeywords": missing_keywords,
        "strongMatches": strong_matches,
        "recommendations": recommendations,
        "status": "analyzed",  # analyzed | applied | interview | offer | rejected
        "createdAt": _now(),
        "updatedAt": _now(),
    }

    # Write to Firestore
    db.collection("users").document(user_id).collection("jobs").document(job_id).set(job_doc)

    return job_doc
