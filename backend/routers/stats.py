"""
Personal Stats router — aggregates personal usage, ROI, and telemetry stats for the user.
"""
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin_init import db, verify_token
from models.stats_model import UserStatsResponse, OperationStat
from google.cloud import firestore

router = APIRouter(prefix="/api/me", tags=["stats"])

@router.get("/stats", response_model=UserStatsResponse)
async def get_my_stats(uid: str = Depends(verify_token)):
    """
    Get user ROI and AI telemetry.
    Uses pre-aggregated summary to save thousands of reads.
    """
    try:
        print(f"DEBUG: uid={uid}, type(uid)={type(uid)}")
        # 1. Fetch pre-aggregated summary
        summary_ref = db.collection("users").document(uid).collection("stats").document("summary")
        doc = summary_ref.get()
        print(f"DEBUG: doc exists={doc.exists}")
        summary = doc.to_dict() or {}
        print(f"DEBUG: summary={summary}, type={type(summary)}")

        # Extract overall totals
        total_calls = summary.get("totalAiCalls", 0)
        total_input = summary.get("totalInputTokens", 0)
        total_output = summary.get("totalOutputTokens", 0)
        total_latency_ms = summary.get("totalLatencyMs", 0)
        total_cache_hits = summary.get("cacheHits", 0)
        
        # Jobs count from summary (requires backfill/increment implementation)
        total_jobs = summary.get("totalJobs", 0)

        # Calculate derived stats
        print(f"DEBUG: total_calls={total_calls}, total_latency={total_latency_ms}")
        avg_latency = round(total_latency_ms / total_calls, 1) if total_calls > 0 else 0
        cache_hit_rate = round((total_cache_hits / total_calls) * 100, 1) if total_calls > 0 else 0

        # 2. Build Operation Breakdown
        ops_dict = summary.get("operations", {})
        operation_breakdown = []
        models_used = set()

        for op_id, op_data in ops_dict.items():
            calls = op_data.get("calls", 0)
            if calls == 0:
                continue
                
            model = op_data.get("model", "unknown")
            models_used.add(model)
            
            operation_breakdown.append(OperationStat(
                operation=op_id,
                model=model,
                calls=calls,
                inputTokens=op_data.get("inputTokens", 0),
                outputTokens=op_data.get("outputTokens", 0),
                avgLatency=round(op_data.get("totalLatencyMs", 0) / calls, 1)
            ))

        return UserStatsResponse(
            totalJobs=total_jobs,
            totalInputTokens=total_input,
            totalOutputTokens=total_output,
            totalAiCalls=total_calls,
            cacheHitRate=cache_hit_rate,
            avgLatencyMs=avg_latency,
            modelsUsed=" · ".join(sorted(list(models_used))) if models_used else "None",
            operationBreakdown=operation_breakdown
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch user stats: {str(e)}")
