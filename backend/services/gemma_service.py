"""
Gemma AI service — handles all AI model interactions.
Uses google-genai (NOT google-generativeai) per AGENTS.md.

Functions:
  - score_ats: quantitative ATS scoring via keyword/section analysis
  - generate_recommendations: resume improvement recommendations
  - rewrite_bullet: rewrite a specific bullet for ATS optimization
  - parse_resume_from_text: parse raw PDF text into ResumeIQ JSON schema

All calls intercept usage_metadata for token logging.
Logging fires as a background thread — never blocks responses.
"""
import os
import json
import time
import uuid
import asyncio
import threading
from google import genai

# Lazy init
_client = None
MODEL = "gemma-4-31b-it"


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY", "")
        _client = genai.Client(api_key=api_key)
    return _client


def _fire_log(user_id: str, operation: str, input_tokens: int, output_tokens: int, latency_ms: float, is_cache_hit: bool = False):
    """Fire-and-forget model usage log in a daemon thread."""
    def _log():
        try:
            from services.model_logger import log_model_call
            log_model_call(
                user_id=user_id,
                model=MODEL,
                operation=operation,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                is_cache_hit=is_cache_hit,
            )
        except Exception:
            pass

    t = threading.Thread(target=_log, daemon=True)
    t.start()


async def score_ats(resume_text: str, jd_text: str, user_id: str = "") -> dict:
    """
    Score resume against a job description (0-100).
    Returns { atsScore, breakdown: { keywordMatch, experienceMatch, skillsMatch, formatScore } }
    """
    prompt = f"""You are an expert ATS (Applicant Tracking System) analyst.

Score the following RESUME against the JOB DESCRIPTION on a scale of 0-100.

Provide a detailed breakdown with these categories (each 0-100):
- keywordMatch: How well does the resume's keywords match the JD's required keywords?
- experienceMatch: Does the resume's experience level and type match the JD requirements?
- skillsMatch: Do the resume's technical/soft skills match what the JD requires?
- formatScore: Is the resume well-structured and ATS-readable?

RESUME:
---
{resume_text}
---

JOB DESCRIPTION:
---
{jd_text}
---

Return ONLY valid JSON in this exact format:
{{
  "atsScore": <number 0-100>,
  "breakdown": {{
    "keywordMatch": <number 0-100>,
    "experienceMatch": <number 0-100>,
    "skillsMatch": <number 0-100>,
    "formatScore": <number 0-100>
  }},
  "missingKeywords": ["keyword1", "keyword2", ...],
  "strongMatches": ["match1", "match2", ...]
}}"""

    return await _call_model_json(prompt, user_id=user_id, operation="score_ats")


async def generate_recommendations(
    resume_text: str, jd_text: str, missing_keywords: list, ats_score: int, user_id: str = ""
) -> list[dict]:
    """
    Generate specific, actionable recommendations to improve resume-JD match.
    Returns list of { type, section, currentText, suggestedText, reason, impact, keywordsAdded }
    """
    prompt = f"""You are an expert resume coach helping a candidate optimize their resume for ATS systems.

CURRENT ATS SCORE: {ats_score}/100
MISSING KEYWORDS: {', '.join(missing_keywords)}

RESUME:
---
{resume_text}
---

JOB DESCRIPTION:
---
{jd_text}
---

Generate 3-7 specific, actionable recommendations to improve the ATS score. For each recommendation:
1. Identify the EXACT bullet point or section that should be changed
2. Provide a REWRITTEN version that naturally incorporates missing keywords
3. The rewrite must be truthful — never fabricate experience or skills
4. Each rewrite should be specific, quantified where possible, and action-verb-led
5. Explain WHY this change improves ATS compatibility

IMPORTANT: Do NOT simplify or shorten bullet points. Make them MORE detailed and keyword-rich.

Return ONLY valid JSON as a list:
[
  {{
    "type": "rewrite_bullet" | "add_skill" | "add_section",
    "section": "experience" | "projects" | "skills" | "education",
    "currentText": "the exact current text being changed (empty if adding)",
    "suggestedText": "the improved rewritten text",
    "reason": "why this change helps ATS matching",
    "impact": "high" | "medium" | "low",
    "keywordsAdded": ["keyword1", "keyword2"]
  }}
]"""

    return await _call_model_json(prompt, user_id=user_id, operation="generate_recs")


async def rewrite_bullet(
    current_text: str, jd_context: str, missing_keywords: list, user_id: str = ""
) -> str:
    """
    Rewrite a single resume bullet to be more ATS-optimized.
    Returns the rewritten text string.
    """
    prompt = f"""You are an expert resume writer. Rewrite this resume bullet point to better match the job description while keeping it truthful and natural.

CURRENT BULLET:
{current_text}

JOB CONTEXT:
{jd_context}

KEYWORDS TO INCORPORATE (naturally, only if relevant):
{', '.join(missing_keywords)}

Rules:
- Start with a strong action verb
- Include quantified results where possible
- Do NOT fabricate experience — only enhance phrasing
- Do NOT shorten — make it MORE detailed
- Keep it to 1-2 lines maximum

Return ONLY the rewritten bullet text, no JSON, no quotes, no explanation."""

    return await _call_model_text(prompt, user_id=user_id, operation="rewrite_bullet")


async def parse_resume_from_text(raw_text: str, user_id: str = "") -> dict:
    """
    Parse raw extracted PDF text into the ResumeIQ JSON schema.
    Used by the PDF import endpoint.

    Returns a structured dict with meta and sections ready for Firestore.
    """
    prompt = f"""You are a resume parser. Convert the raw resume text below into a structured JSON object.

RAW RESUME TEXT:
---
{raw_text[:8000]}
---

Return ONLY valid JSON matching this exact schema:
{{
  "meta": {{
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, Country",
    "title": "Professional Title (e.g. Software Engineer)",
    "summary": "Professional summary paragraph",
    "linkedin": "LinkedIn URL or empty string",
    "github": "GitHub URL or empty string",
    "website": "Personal website URL or empty string"
  }},
  "sections": [
    {{
      "type": "experience",
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, Country",
      "startDate": "Month Year",
      "endDate": "Month Year or Present",
      "current": false,
      "bullets": [
        {{"text": "Bullet point text"}}
      ]
    }},
    {{
      "type": "skills",
      "categories": [
        {{"label": "Languages", "items": ["Python", "JavaScript"]}},
        {{"label": "Frameworks", "items": ["React", "FastAPI"]}}
      ]
    }},
    {{
      "type": "education",
      "items": [
        {{
          "degree": "Bachelor of Science in Computer Science",
          "institution": "University Name",
          "location": "City, Country",
          "startYear": "2019",
          "endYear": "2023",
          "grade": "3.8 GPA"
        }}
      ]
    }},
    {{
      "type": "projects",
      "items": [
        {{
          "name": "Project Name",
          "techStack": "React, Python, PostgreSQL",
          "description": "One-line project description",
          "startDate": "",
          "endDate": "",
          "bullets": [
            {{"text": "What you built and the impact"}}
          ]
        }}
      ]
    }}
  ]
}}

Rules:
- Include ALL sections from the resume (only include section types that exist in the resume)
- Multiple experience entries should each be their own experience object in the sections array
- Keep bullets truthful and intact — do not paraphrase
- If a field is not present in the resume, use an empty string
- Return ONLY the JSON, no markdown, no explanation"""

    return await _call_model_json(prompt, user_id=user_id, operation="parse_resume_pdf")


async def _call_model_json(prompt: str, user_id: str = "", operation: str = "") -> dict | list:
    """Call Gemma model expecting JSON output. Retries once with 2s sleep. Logs token usage."""
    client = _get_client()

    for attempt in range(2):
        try:
            t0 = time.monotonic()
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0.3,
                },
            )
            latency_ms = (time.monotonic() - t0) * 1000

            # Log token usage (fire-and-forget)
            if user_id:
                meta = response.usage_metadata
                _fire_log(
                    user_id=user_id,
                    operation=operation,
                    input_tokens=getattr(meta, "prompt_token_count", 0) or 0,
                    output_tokens=getattr(meta, "candidates_token_count", 0) or 0,
                    latency_ms=latency_ms,
                )

            return json.loads(response.text)
        except Exception:
            if attempt == 0:
                time.sleep(2)
            else:
                raise


async def _call_model_text(prompt: str, user_id: str = "", operation: str = "") -> str:
    """Call Gemma model expecting plain text output. Retries once with 2s sleep. Logs token usage."""
    client = _get_client()

    for attempt in range(2):
        try:
            t0 = time.monotonic()
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=MODEL,
                contents=prompt,
                config={
                    "temperature": 0.4,
                },
            )
            latency_ms = (time.monotonic() - t0) * 1000

            # Log token usage (fire-and-forget)
            if user_id:
                meta = response.usage_metadata
                _fire_log(
                    user_id=user_id,
                    operation=operation,
                    input_tokens=getattr(meta, "prompt_token_count", 0) or 0,
                    output_tokens=getattr(meta, "candidates_token_count", 0) or 0,
                    latency_ms=latency_ms,
                )

            return response.text.strip()
        except Exception:
            if attempt == 0:
                time.sleep(2)
            else:
                raise
