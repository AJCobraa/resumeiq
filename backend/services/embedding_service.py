"""
Embedding service — generates embeddings for resume text using gemini-embedding-001.
Caches embeddings in the PostgreSQL `resume_embeddings` table.

Cache is recomputed on every resume SAVE — not on every analysis.
Package: google-genai (NOT google-generativeai) — per AGENTS.md.

Logs token usage to coin_transactions table via model_logger.
"""
import os
import time
import asyncio
import threading
from google import genai

# Lazy-init client
_client = None

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 3072  # 3072-dimensional vectors for gemini-embedding-001


def _get_client():
    global _client
    if _client is None:
        app_env = os.environ.get("APP_ENV", "dev")
        if app_env == "prod":
            _client = genai.Client(vertexai=True)
        else:
            api_key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY", "")
            _client = genai.Client(api_key=api_key)
    return _client


async def _log_embedding_usage(user_id: str, operation: str, input_tokens: int):
    """Awaitable embedding usage log."""
    try:
        from services.model_logger import log_model_call
        await log_model_call(
            user_id=user_id,
            model=EMBEDDING_MODEL,
            operation=operation,
            input_tokens=input_tokens,
            output_tokens=0,
        )
    except Exception:
        pass



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

            # Log usage
            if user_id:
                # Estimate input tokens: ~1 token per 4 chars
                est_tokens = sum(len(t) // 4 for t in texts)
                await _log_embedding_usage(user_id, "embed_resume", est_tokens)

            break
        except Exception:
            if attempt == 0:
                await asyncio.sleep(2)  # retry once with 2s sleep
            else:
                raise

    # Attach embeddings to chunks
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i]

    return chunks


async def update_embeddings_cache(user_id: str, resume_id: str, resume_data: dict):
    """
    Compute embeddings and write them to the PostgreSQL resume_embeddings table.
    Called on resume save — not on every analysis.
    Replaces the old Firestore embeddingsCache approach.
    """
    from core.database import async_session
    from models.postgres_schema import Resume, ResumeEmbedding
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # Yield to let the main request finish its commit/cleanup
    await asyncio.sleep(0.5)

    chunks = await compute_embeddings(resume_data, user_id=user_id)

    async with async_session() as db:
        async with db.begin():
            # Load the resume object WITH its embeddings to let SQLAlchemy manage the collection
            result = await db.execute(
                select(Resume)
                .options(selectinload(Resume.embeddings))
                .where(Resume.resume_id == resume_id, Resume.user_id == user_id)
            )
            resume_row = result.scalar_one_or_none()
            
            if not resume_row:
                return chunks

            # Clear existing embeddings and add new ones
            # Because of cascade="all, delete-orphan", clearing the list deletes them from DB
            resume_row.embeddings = [
                ResumeEmbedding(
                    chunk_id=chunk["chunkId"],
                    embedding=chunk["embedding"],
                )
                for chunk in chunks
            ]
            # No need for manual db.execute(delete(...)) or db.commit() here 
            # because db.begin() block will commit automatically on exit.

    return chunks


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
                await _log_embedding_usage(user_id, "embed_jd", est_tokens)

            return result.embeddings[0].values
        except Exception:
            if attempt == 0:
                await asyncio.sleep(2)
            else:
                raise


async def get_jd_sentence_embeddings(texts: list[str], user_id: str = "") -> list[list[float]]:
    """
    Compute embeddings for a list of job description sentences.
    Used in the analysis pipeline for line-by-line similarity.

    Retries once with 2s sleep on failure.
    """
    if not texts:
        return []

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

            # Log usage
            if user_id:
                est_tokens = sum(len(t) // 4 for t in texts)
                await _log_embedding_usage(user_id, "embed_jd_sentences", est_tokens)

            return [e.values for e in result.embeddings]
        except Exception:
            if attempt == 0:
                await asyncio.sleep(2)
            else:
                raise
