"""
Personal Stats router — aggregates personal usage, ROI, and telemetry stats for the user.
"""
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin_init import db, verify_token
from models.stats_model import UserStatsResponse
from google.cloud import firestore

router = APIRouter(prefix="/api/me", tags=["stats"])

@router.get("/stats", response_model=UserStatsResponse)
async def get_my_stats(uid: str = Depends(verify_token)):
    """Aggregates personal usage, ROI, and telemetry stats for the user."""
    try:
        # 1. Fetch User's Jobs
        jobs_query = db.collection("users").document(uid).collection("jobs").stream()
        total_jobs, total_approved_fixes, total_score_improvement, jobs_with_improvement = 0, 0, 0, 0

        for job_doc in jobs_query:
            job = job_doc.to_dict()
            total_jobs += 1
            
            recs = job.get("recommendations", [])
            total_approved_fixes += sum(1 for r in recs if r.get("status") in ["approved", "edited"])

            current_score = job.get("atsScore", 0)
            initial_score = job.get("initialAtsScore", current_score)
            
            if current_score > initial_score:
                total_score_improvement += (current_score - initial_score)
                jobs_with_improvement += 1

        avg_improvement = round(total_score_improvement / jobs_with_improvement, 1) if jobs_with_improvement > 0 else 0.0

        # 2. Fetch User's Model Logs (Ordered by timestamp DESC)
        # Note: Requires composite index: userId (ASC) + timestamp (DESC)
        logs_query = db.collection("modelLogs").where("userId", "==", uid)\
                       .order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
        
        total_input_tokens, total_output_tokens, total_calls, cache_hits, total_latency = 0, 0, 0, 0, 0
        models_used = set()
        operation_breakdown = {}
        recent_calls = []

        for log_doc in logs_query:
            log = log_doc.to_dict()
            total_calls += 1
            
            in_tok = log.get("inputTokens", 0) or 0
            out_tok = log.get("outputTokens", 0) or 0
            lat = log.get("latencyMs", 0) or 0
            op = log.get("operation", "unknown")
            mod = log.get("model", "unknown")
            
            total_input_tokens += in_tok
            total_output_tokens += out_tok
            total_latency += lat
            models_used.add(mod)
            if log.get("isCacheHit", False): cache_hits += 1

            if op not in operation_breakdown:
                operation_breakdown[op] = {"operation": op, "model": mod, "calls": 0, "inputTokens": 0, "outputTokens": 0, "totalLatency": 0}
            
            operation_breakdown[op]["calls"] += 1
            operation_breakdown[op]["inputTokens"] += in_tok
            operation_breakdown[op]["outputTokens"] += out_tok
            operation_breakdown[op]["totalLatency"] += lat

            if len(recent_calls) < 10:
                recent_calls.append({
                    "operation": op, 
                    "model": mod, 
                    "inputTokens": in_tok, 
                    "outputTokens": out_tok, 
                    "latencyMs": lat, 
                    "timestamp": log.get("timestamp")
                })

        cache_rate = round((cache_hits / total_calls * 100), 1) if total_calls > 0 else 0.0
        avg_latency = round((total_latency / total_calls), 1) if total_calls > 0 else 0.0
        
        breakdown_list = []
        for op, data in operation_breakdown.items():
            data["avgLatency"] = round(data["totalLatency"] / data["calls"], 1)
            del data["totalLatency"]
            breakdown_list.append(data)
        breakdown_list.sort(key=lambda x: x["calls"], reverse=True)

        return {
            "totalJobs": total_jobs,
            "approvedFixes": total_approved_fixes,
            "avgAtsImprovement": avg_improvement,
            "totalInputTokens": total_input_tokens,
            "totalOutputTokens": total_output_tokens,
            "totalAiCalls": total_calls,
            "cacheHitRate": cache_rate,
            "avgLatencyMs": avg_latency,
            "modelsUsed": " · ".join(list(models_used)) if models_used else "None",
            "operationBreakdown": breakdown_list,
            "recentCalls": recent_calls
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user stats: {str(e)}")
