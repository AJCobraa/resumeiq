"""
Model Logger — fire-and-forget logging of AI model calls to Firestore.
Tracks token usage, latency, model name, operation type, and cache hits.
Writes to the root-level `modelLogs` collection.

Never blocks the API response — always called as a BackgroundTask.
"""
import uuid
from datetime import datetime, timezone
from google.cloud import firestore
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
    Write a model usage log entry to Firestore and atomically update the user's stats summary.

    IMPORTANT: Uses update() for the summary doc — NOT set(merge=True) — because
    dot-notation field paths (e.g. "operations.score_ats.calls") are only parsed as
    nested paths by update(). set(merge=True) treats them as literal flat field names,
    which would silently break the operation breakdown.
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

        # 1. Create the log entry (unchanged)
        db.collection("modelLogs").document(log_id).set(doc)

        # 2. Build the atomic increment payload using dot-notation field paths.
        #    These are only valid in update(), NOT in set(merge=True).
        summary_ref = (
            db.collection("users")
            .document(user_id)
            .collection("stats")
            .document("summary")
        )

        increment_data = {
            "totalAiCalls": firestore.Increment(1),
            "totalInputTokens": firestore.Increment(input_tokens),
            "totalOutputTokens": firestore.Increment(output_tokens),
            "totalLatencyMs": firestore.Increment(latency_ms),
            f"operations.{operation}.calls": firestore.Increment(1),
            f"operations.{operation}.inputTokens": firestore.Increment(input_tokens),
            f"operations.{operation}.outputTokens": firestore.Increment(output_tokens),
            f"operations.{operation}.totalLatencyMs": firestore.Increment(latency_ms),
            f"operations.{operation}.model": model,
        }

        if is_cache_hit:
            increment_data["cacheHits"] = firestore.Increment(1)

        # 3. Try update() first — works for existing documents and correctly
        #    resolves dot-notation as nested field paths.
        try:
            summary_ref.update(increment_data)
        except Exception:
            # Document does not exist yet (new user). Fall back to set() with a
            # properly nested Python dict. Do NOT use dot-notation keys here.
            initial_doc = {
                "totalAiCalls": 1,
                "totalInputTokens": input_tokens,
                "totalOutputTokens": output_tokens,
                "totalLatencyMs": round(latency_ms, 2),
                "cacheHits": 1 if is_cache_hit else 0,
                "totalJobs": 0,
                "operations": {
                    operation: {
                        "calls": 1,
                        "inputTokens": input_tokens,
                        "outputTokens": output_tokens,
                        "totalLatencyMs": round(latency_ms, 2),
                        "model": model,
                    }
                },
            }
            summary_ref.set(initial_doc)

    except Exception:
        pass  # Logging must never crash the main flow
