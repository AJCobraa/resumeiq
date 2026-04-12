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
        
        # 1. Create the log entry
        db.collection("modelLogs").document(log_id).set(doc)

        # 2. Atomically update the summary document
        # Location: users/{userId}/stats/summary
        summary_ref = db.collection("users").document(user_id).collection("stats").document("summary")
        
        increment_data = {
            "totalAiCalls": firestore.Increment(1),
            "totalInputTokens": firestore.Increment(input_tokens),
            "totalOutputTokens": firestore.Increment(output_tokens),
            "totalLatencyMs": firestore.Increment(latency_ms),
            f"operations.{operation}.calls": firestore.Increment(1),
            f"operations.{operation}.inputTokens": firestore.Increment(input_tokens),
            f"operations.{operation}.outputTokens": firestore.Increment(output_tokens),
            f"operations.{operation}.totalLatencyMs": firestore.Increment(latency_ms),
            f"operations.{operation}.model": model, # Overwrites with last used model name
        }

        if is_cache_hit:
            increment_data["cacheHits"] = firestore.Increment(1)

        summary_ref.set(increment_data, merge=True)

    except Exception:
        pass  # Logging must never crash the main flow
