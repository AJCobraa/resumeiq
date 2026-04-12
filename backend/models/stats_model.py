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

class RecentCallStat(BaseModel):
    operation: str
    model: str
    inputTokens: int
    outputTokens: int
    latencyMs: float
    timestamp: Optional[datetime]

class UserStatsResponse(BaseModel):
    totalJobs: int
    totalInputTokens: int
    totalOutputTokens: int
    totalAiCalls: int
    cacheHitRate: float
    avgLatencyMs: float
    modelsUsed: str
    operationBreakdown: List[OperationStat]
