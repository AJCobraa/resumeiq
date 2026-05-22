from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class OperationStat(BaseModel):
    operation: str
    model: str
    calls: int
    inputTokens: int
    outputTokens: int
    avgLatency: float

class UserStatsResponse(BaseModel):
    coinsBalance: int
    totalResumes: int
    totalJobs: int
    totalInputTokens: int
    totalOutputTokens: int
    totalAiCalls: int
    cacheHitRate: float
    avgLatencyMs: float
    modelsUsed: str
    operationBreakdown: List[OperationStat]

class TransactionRecord(BaseModel):
    id: str
    operation: str
    created_at: datetime
    amount: int
