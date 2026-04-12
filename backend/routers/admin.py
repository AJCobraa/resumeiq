"""
Admin router — aggregated model usage statistics.
GET /api/admin/stats — reads modelLogs collection and returns aggregate metrics.

All stats are computed on-the-fly from Firestore.
For large-scale production, this would be replaced by a scheduled aggregation job.
"""
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin_init import db, verify_token

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def get_admin_stats(uid: str = Depends(verify_token)):
    """
    Aggregate model usage statistics from the modelLogs collection.

    Returns:
      - totalCalls: total number of model calls logged
      - totalInputTokens: sum of all input tokens
      - totalOutputTokens: sum of all output tokens
      - totalCost: estimated cost (placeholder)
      - cacheHitRate: percentage of calls that were JD cache hits
      - avgLatencyMs: average model call latency
      - breakdown: per-operation breakdown
      - recentLogs: last 10 log entries
    """
    try:
        # 1. Fetch last 50 logs for recent call list and breakdown
        docs = list(db.collection("modelLogs")
                      .order_by("timestamp", direction="DESCENDING")
                      .limit(50)
                      .stream())

        total_calls = len(docs)
        total_input_tokens = 0
        total_output_tokens = 0
        total_latency = 0.0
        cache_hits = 0
        breakdown = {}

        for doc in docs:
            d = doc.to_dict()
            input_t = d.get("inputTokens", 0) or 0
            output_t = d.get("outputTokens", 0) or 0
            latency = d.get("latencyMs", 0) or 0
            operation = d.get("operation", "unknown")
            is_hit = d.get("isCacheHit", False)

            total_input_tokens += input_t
            total_output_tokens += output_t
            total_latency += latency

            if is_hit:
                cache_hits += 1

            # Per-operation breakdown
            if operation not in breakdown:
                breakdown[operation] = {
                    "calls": 0,
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "avgLatencyMs": 0,
                    "model": d.get("model", ""),
                }
            breakdown[operation]["calls"] += 1
            breakdown[operation]["inputTokens"] += input_t
            breakdown[operation]["outputTokens"] += output_t
            breakdown[operation]["avgLatencyMs"] += latency

        # Compute averages
        for op in breakdown:
            count = breakdown[op]["calls"]
            if count > 0:
                breakdown[op]["avgLatencyMs"] = round(breakdown[op]["avgLatencyMs"] / count, 1)

        cache_hit_rate = round((cache_hits / total_calls * 100), 1) if total_calls > 0 else 0.0
        avg_latency = round(total_latency / total_calls, 1) if total_calls > 0 else 0.0

        # Recent logs for display (last 10, newest first)
        recent_logs = []
        for doc in docs[:10]:
            d = doc.to_dict()
            recent_logs.append({
                "logId": d.get("logId"),
                "model": d.get("model"),
                "operation": d.get("operation"),
                "inputTokens": d.get("inputTokens", 0),
                "outputTokens": d.get("outputTokens", 0),
                "latencyMs": d.get("latencyMs", 0),
                "isCacheHit": d.get("isCacheHit", False),
                "timestamp": d.get("timestamp"),
            })

        return {
            "totalCalls": total_calls,
            "totalInputTokens": total_input_tokens,
            "totalOutputTokens": total_output_tokens,
            "cacheHitRate": cache_hit_rate,
            "avgLatencyMs": avg_latency,
            "breakdown": breakdown,
            "recentLogs": recent_logs,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to aggregate stats: {str(e)}")
