"""
Backfill script to initialize the 'users/{uid}/stats/summary' document for all users.
Run this one-time to migrate the existing un-aggregated logs into the summary document.
"""
import sys
import os
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from firebase_admin_init import db

def backfill_all():
    print("Starting backfill for all users...")
    users_ref = db.collection("users")
    users = users_ref.stream()

    for user_doc in users:
        uid = user_doc.id
        print(f"Processing user: {uid}")
        
        # 1. Aggregate Model Logs
        logs = db.collection("modelLogs").where("userId", "==", uid).stream()
        
        summary = {
            "totalAiCalls": 0,
            "totalInputTokens": 0,
            "totalOutputTokens": 0,
            "totalLatencyMs": 0,
            "cacheHits": 0,
            "operations": {}
        }
        
        for log_doc in logs:
            log = log_doc.to_dict()
            summary["totalAiCalls"] += 1
            summary["totalInputTokens"] += log.get("inputTokens", 0)
            summary["totalOutputTokens"] += log.get("outputTokens", 0)
            summary["totalLatencyMs"] += log.get("latencyMs", 0)
            if log.get("isCacheHit"):
                summary["cacheHits"] += 1
            
            op = log.get("operation", "unknown")
            if op not in summary["operations"]:
                summary["operations"][op] = {
                    "calls": 0,
                    "inputTokens": 0,
                    "outputTokens": 0,
                    "totalLatencyMs": 0,
                    "model": log.get("model", "unknown")
                }
            
            summary["operations"][op]["calls"] += 1
            summary["operations"][op]["inputTokens"] += log.get("inputTokens", 0)
            summary["operations"][op]["outputTokens"] += log.get("outputTokens", 0)
            summary["operations"][op]["totalLatencyMs"] += log.get("latencyMs", 0)

        # 2. Count Jobs
        jobs_query = users_ref.document(uid).collection("jobs").stream()
        total_jobs = 0
        for _ in jobs_query:
            total_jobs += 1
        summary["totalJobs"] = total_jobs

        # 3. Write summary
        if summary["totalAiCalls"] > 0 or total_jobs > 0:
            summary_ref = users_ref.document(uid).collection("stats").document("summary")
            summary_ref.set(summary)
            print(f"  - Summary updated for {uid}")
        else:
            print(f"  - No data for {uid}, skipping document creation.")

    print("Backfill complete.")

if __name__ == "__main__":
    backfill_all()
