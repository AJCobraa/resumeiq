from pydantic import BaseModel, ValidationError
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
    latencyMs: int
    timestamp: Optional[datetime]

class UserStatsResponse(BaseModel):
    totalJobs: int
    approvedFixes: int
    avgAtsImprovement: float
    totalInputTokens: int
    totalOutputTokens: int
    totalAiCalls: int
    cacheHitRate: float
    avgLatencyMs: float
    modelsUsed: str
    operationBreakdown: List[OperationStat]
    recentCalls: List[RecentCallStat]

data = {'totalJobs': 7, 'approvedFixes': 1, 'avgAtsImprovement': 12.0, 'totalInputTokens': 268214, 'totalOutputTokens': 62799, 'totalAiCalls': 133, 'cacheHitRate': 0.0, 'avgLatencyMs': 35829.1, 'modelsUsed': 'gemini-embedding-001 · gemma-4-31b-it', 'operationBreakdown': [{'operation': 'embed_resume', 'model': 'gemini-embedding-001', 'calls': 41, 'inputTokens': 54186, 'outputTokens': 0, 'avgLatency': 2076.5}], 'recentCalls': [{'operation': 'embed_resume', 'model': 'gemini-embedding-001', 'inputTokens': 1536, 'outputTokens': 0, 'latencyMs': 2006.96, 'timestamp': '2026-04-11T08:16:51.904606+00:00'}]}

try:
    obj = UserStatsResponse(**data)
    print("VALIDATION SUCCESS")
except ValidationError as e:
    print("VALIDATION FAILED")
    print(e)
