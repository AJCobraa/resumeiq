"""
Embedding service — generates embeddings for resume text using text-embedding-004.
Caches embeddings in the Firestore resume document under `embeddingsCache`.

Cache is recomputed on every resume SAVE — not on every analysis.
Package: google-genai (NOT google-generativeai) — per AGENTS.md.

Now also logs token usage to modelLogs collection via model_logger.
"""
import os
import time
import asyncio
import threading
from google import genai
from firebase_admin import firestore as fs

# Lazy-init client
_client = None

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 3072  # 3072-dimensional vectors for gemini-embedding-001


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY", "")
        _client = genai.Client(api_key=api_key)
    return _client


def _fire_embed_log(user_id: str, operation: str, input_tokens: int, latency_ms: float, is_cache_hit: bool = False):
    """Fire-and-forget embedding usage log."""
    def _log():
        try:
            from services.model_logger import log_model_call
            log_model_call(
                user_id=user_id,
                model=EMBEDDING_MODEL,
                operation=operation,
                input_tokens=input_tokens,
                output_tokens=0,  # Embedding models have no output tokens
                latency_ms=latency_ms,
                is_cache_hit=is_cache_hit,
            )
        except Exception:
            pass

    t = threading.Thread(target=_log, daemon=True)
    t.start()


def _extract_resume_texts(resume: dict) -> list[dict]:
    """
    Extract text chunks from a resume document for embedding.
    Returns list of { chunkId, text } dicts.
    """
    chunks = []
    meta = resume.get("meta", {})

    # Professional summary
    if meta.get("summary"):
        chunks.append({
            "chunkId": "meta_summary",
            "text": f"{meta.get('title', '')} — {meta['summary']}",
        })

    # Sections
    for section in resume.get("sections", []):
        stype = section.get("type", "")
        sid = section.get("sectionId", "")

        if stype == "experience":
            # Combine role + company + bullets into a single chunk
            header = f"{section.get('role', '')} at {section.get('company', '')}"
            bullets = " ".join(
                b["text"] for b in section.get("bullets", []) if b.get("text")
            )
            if header.strip(" at ") or bullets:
                chunks.append({
                    "chunkId": f"exp_{sid}",
                    "text": f"{header}. {bullets}".strip(),
                })

        elif stype == "projects":
            for item in section.get("items", []):
                name = item.get("name", "")
                tech = item.get("techStack", "")
                bullets = " ".join(
                    b["text"] for b in item.get("bullets", []) if b.get("text")
                )
                if name or bullets:
                    chunks.append({
                        "chunkId": f"proj_{item.get('projectId', '')}",
                        "text": f"{name} [{tech}]. {bullets}".strip(),
                    })

        elif stype == "skills":
            for cat in section.get("categories", []):
                label = cat.get("label", "")
                items = ", ".join(cat.get("items", []))
                if label or items:
                    chunks.append({
                        "chunkId": f"skill_{cat.get('categoryId', '')}",
                        "text": f"{label}: {items}",
                    })

        elif stype == "education":
            for item in section.get("items", []):
                degree = item.get("degree", "")
                institution = item.get("institution", "")
                if degree or institution:
                    chunks.append({
                        "chunkId": f"edu_{item.get('eduId', '')}",
                        "text": f"{degree} from {institution}",
                    })

    return chunks


async def compute_embeddings(resume: dict, user_id: str = "") -> list[dict]:
    """
    Compute embeddings for all text chunks in a resume.
    Returns list of { chunkId, text, embedding } dicts.

    Retries once with 2s sleep on failure (per AGENTS.md).
    """
    chunks = _extract_resume_texts(resume)
    if not chunks:
        return []

    texts = [c["text"] for c in chunks]
    client = _get_client()

    for attempt in range(2):
        try:
            t0 = time.monotonic()
            result = await asyncio.to_thread(
                client.models.embed_content,
                model=EMBEDDING_MODEL,
                contents=texts,
            )
            latency_ms = (time.monotonic() - t0) * 1000
            embeddings = [e.values for e in result.embeddings]

            # Log usage (fire-and-forget)
            if user_id:
                # Estimate input tokens: ~1 token per 4 chars
                est_tokens = sum(len(t) // 4 for t in texts)
                _fire_embed_log(user_id, "embed_resume", est_tokens, latency_ms)

            break
        except Exception:
            if attempt == 0:
                time.sleep(2)  # retry once with 2s sleep
            else:
                raise

    # Attach embeddings to chunks
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i]

    return chunks


async def update_embeddings_cache(user_id: str, resume_id: str, resume: dict):
    """
    Compute embeddings and write them to the Firestore embeddingsCache field.
    Called on resume save — not on every analysis.
    """
    chunks = await compute_embeddings(resume, user_id=user_id)

    # Shape for Firestore: { chunks: [...], updatedAt }
    cache_data = {
        "chunks": [
            {
                "chunkId": c["chunkId"],
                "text": c["text"],
                "embedding": c["embedding"],
            }
            for c in chunks
        ],
        "updatedAt": fs.SERVER_TIMESTAMP,
    }

    # Write to Firestore
    db = fs.client()
    doc_ref = db.collection("users").document(user_id).collection("resumes").document(resume_id)

    await asyncio.to_thread(
        doc_ref.update, {"embeddingsCache": cache_data}
    )

    return cache_data


async def get_jd_embedding(text: str, user_id: str = "") -> list[float]:
    """
    Compute a single embedding for a job description text.
    Used in the analysis pipeline for similarity comparison.

    Retries once with 2s sleep on failure.
    """
    client = _get_client()

    for attempt in range(2):
        try:
            t0 = time.monotonic()
            result = await asyncio.to_thread(
                client.models.embed_content,
                model=EMBEDDING_MODEL,
                contents=[text],
            )
            latency_ms = (time.monotonic() - t0) * 1000

            # Log usage
            if user_id:
                est_tokens = len(text) // 4
                _fire_embed_log(user_id, "embed_jd", est_tokens, latency_ms)

            return result.embeddings[0].values
        except Exception:
            if attempt == 0:
                time.sleep(2)
            else:
                raise
