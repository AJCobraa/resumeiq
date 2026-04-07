"""
Model Logger — fire-and-forget logging of AI model calls to Firestore.
Tracks token usage, latency, model name, operation type, and cache hits.
Writes to the root-level `modelLogs` collection.

Never blocks the API response — always called as a BackgroundTask.
"""
import uuid
from datetime import datetime, timezone
from firebase_admin_init import db


def _now_ts():
    return datetime.now(timezone.utc).isoformat()


def log_model_call(
    user_id: str,
    model: str,
    operation: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: float,
    is_cache_hit: bool = False,
):
    """
    Write a model usage log entry to Firestore (runs synchronously in a background thread).

    Operations:
      - "score_ats"         — ATS scoring via Gemma
      - "generate_recs"     — Recommendation generation via Gemma
      - "rewrite_bullet"    — Single bullet rewrite via Gemma
      - "parse_resume_pdf"  — Resume PDF parsing via Gemma
      - "embed_resume"      — Resume embedding via text-embedding-004
      - "embed_jd"          — JD embedding via text-embedding-004
    """
    try:
        log_id = str(uuid.uuid4())
        doc = {
            "logId": log_id,
            "userId": user_id,
            "model": model,
            "operation": operation,
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "latencyMs": round(latency_ms, 2),
            "isCacheHit": is_cache_hit,
            "timestamp": _now_ts(),
        }
        db.collection("modelLogs").document(log_id).set(doc)
    except Exception:
        pass  # Logging must never crash the main flow
