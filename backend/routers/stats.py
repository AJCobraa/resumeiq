"""
Personal Stats router — aggregates personal usage, ROI, and telemetry stats for the user.
All data sourced from PostgreSQL coin_transactions and jobs tables.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from firebase_admin_init import verify_token
from core.database import get_db_session
from models.postgres_schema import CoinTransaction, Job, UserCredit, Resume
from models.stats_model import UserStatsResponse, OperationStat

router = APIRouter(prefix="/api/me", tags=["stats"])


@router.get("/stats", response_model=UserStatsResponse)
async def get_my_stats(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get user ROI and AI telemetry.
    Aggregates directly from coin_transactions table — no pre-aggregated summary needed.
    """
    try:
        # 1. Overall totals from coin_transactions
        totals_result = await db.execute(
            select(
                func.count(CoinTransaction.id).label("total_calls"),
                func.coalesce(func.sum(CoinTransaction.input_tokens), 0).label("total_input"),
                func.coalesce(func.sum(CoinTransaction.output_tokens), 0).label("total_output"),
            ).where(CoinTransaction.user_id == uid)
        )
        totals = totals_result.one()
        total_calls = totals.total_calls or 0
        total_input = totals.total_input or 0
        total_output = totals.total_output or 0

        # 2. Total jobs count
        jobs_count_result = await db.execute(
            select(func.count(Job.job_id)).where(Job.user_id == uid)
        )
        total_jobs = jobs_count_result.scalar() or 0

        # 2b. Total resumes count
        resumes_count_result = await db.execute(
            select(func.count(Resume.resume_id)).where(Resume.user_id == uid)
        )
        total_resumes = resumes_count_result.scalar() or 0

        # 3. Operation breakdown
        ops_result = await db.execute(
            select(
                CoinTransaction.operation,
                func.count(CoinTransaction.id).label("calls"),
                func.coalesce(func.sum(CoinTransaction.input_tokens), 0).label("input_tokens"),
                func.coalesce(func.sum(CoinTransaction.output_tokens), 0).label("output_tokens"),
            )
            .where(CoinTransaction.user_id == uid)
            .group_by(CoinTransaction.operation)
        )
        ops_rows = ops_result.all()

        operation_breakdown = []
        models_used = set()

        # Map operations to models for display
        OP_MODEL_MAP = {
            "analyze_and_recommend": "gemma-4-31b-it",
            "parse_resume_pdf": "gemma-4-31b-it",
            "rewrite_bullet": "gemma-4-31b-it",
            "generate_interview_prep": "gemma-4-31b-it",
            "embed_resume": "gemini-embedding-001",
            "embed_jd": "gemini-embedding-001",
            "embed_jd_sentences": "gemini-embedding-001",
        }

        for row in ops_rows:
            if row.calls == 0:
                continue
            model = OP_MODEL_MAP.get(row.operation, "unknown")
            models_used.add(model)
            operation_breakdown.append(OperationStat(
                operation=row.operation,
                model=model,
                calls=row.calls,
                inputTokens=row.input_tokens,
                outputTokens=row.output_tokens,
                avgLatency=0,  # Latency tracking was removed in the Postgres migration
            ))

        # 4. Get coin balance
        credit_result = await db.execute(
            select(UserCredit).where(UserCredit.user_id == uid)
        )
        credit = credit_result.scalar_one_or_none()
        coins_balance = (credit.coins_balance + credit.topup_coins_balance) if credit else 0

        return UserStatsResponse(
            coinsBalance=coins_balance,
            totalResumes=total_resumes,
            totalJobs=total_jobs,
            totalInputTokens=total_input,
            totalOutputTokens=total_output,
            totalAiCalls=total_calls,
            cacheHitRate=0,  # Cache hit tracking simplified
            avgLatencyMs=0,  # Latency tracking was removed in the Postgres migration
            modelsUsed=" · ".join(sorted(list(models_used))) if models_used else "None",
            operationBreakdown=operation_breakdown
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch user stats: {str(e)}")
