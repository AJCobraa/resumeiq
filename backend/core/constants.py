# backend/core/constants.py

# Fixed Coin Costs for Operations (Includes 2x markup)
# 1 coin = $0.0001 USD
FIXED_COST = {
    "parse_resume_pdf": 35,
    "analyze_and_recommend": 30,
    "generate_interview_prep": 12,
    "rewrite_bullet": 3,
    "embed_resume": 6,
    "embed_jd_sentences": 3,
}

# Plan details
PLANS = {
    "free": {"coins_per_month": 0, "resume_limit": 1},
    "starter": {"coins_per_month": 22750, "resume_limit": 3},
    "pro": {"coins_per_month": 82000, "resume_limit": 10},
    "growth": {"coins_per_month": 182000, "resume_limit": float('inf')} # no limit
}
