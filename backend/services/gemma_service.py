"""
Gemma AI service — handles all AI model interactions.
Uses google-genai (NOT google-generativeai) per AGENTS.md.

Functions:
  - analyze_resume_and_recommend: combined ATS scoring and recommendation generation
  - rewrite_bullet: rewrite a specific bullet for ATS optimization
  - parse_resume_from_text: parse raw PDF text into ResumeIQ JSON schema
  - generate_interview_prep: predict interview questions based on company tier and gaps

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
from google.genai import errors
from core.exceptions import GemmaOverloadError, is_ai_transient_error
import re

# Lazy init
_client = None
MODEL = "gemma-4-31b-it"

def _clean_json_response(text: str) -> str:
    """Strip markdown code fences (```json ... ```) if present."""
    if not text:
        return ""
    text = text.strip()
    # Remove markdown code blocks
    text = re.sub(r'^```json\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def _get_client():
    global _client
    if _client is None:
        app_env = os.environ.get("APP_ENV", "dev")
        if app_env == "prod":
            # Uses standard Google Cloud authentication automatically (Vertex AI)
            _client = genai.Client(vertexai=True)
        else:
            api_key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY", "")
            _client = genai.Client(api_key=api_key)
    return _client


def _fire_log(user_id: str, operation: str, input_tokens: int, output_tokens: int, latency_ms: float, is_cache_hit: bool = False):
    """Fire-and-forget model usage log on the running event loop."""
    try:
        import asyncio
        from services.model_logger import log_model_call
        loop = asyncio.get_running_loop()
        loop.create_task(log_model_call(
            user_id=user_id,
            model=MODEL,
            operation=operation,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        ))
    except Exception:
        pass




async def analyze_resume_and_recommend(
    resume_text: str,
    jd_text: str,
    user_id: str = ""
) -> dict:
    """
    Single combined Gemma call that replaces score_ats + generate_recommendations.
    Returns {
        atsScore, breakdown, missingKeywords, strongMatches, recommendations
    }
    """
    prompt = f"""You are an expert ATS analyst and resume coach.

Analyze the RESUME against the JOB DESCRIPTION and return a single JSON object.

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
  "missingKeywords": ["keyword1", "keyword2"],
  "strongMatches": ["match1", "match2"],
  "recommendations": [
    {{
      "type": "experience" | "projects" | "skills" | "summary",
      "currentText": "the exact text being changed",
      "suggestedText": "the improved rewritten text",
      "reason": "why this change improves ATS matching",
      "impact": "high" | "medium" | "low",
      "keywordsAdded": ["keyword1", "keyword2"]
    }}
  ]
}}

RULES FOR ATS SCORING:
- atsScore is 0-100 overall score
- breakdown scores are each 0-100 independently based on these criteria:
  - keywordMatch: How well does the resume's keywords match the JD's required keywords?
  - experienceMatch: Does the resume's experience level and type match the JD requirements?
  - skillsMatch: Do the resume's technical/soft skills match what the JD requires?
  - formatScore: Is the resume well-structured and ATS-readable?

RULES FOR RECOMMENDATIONS (generate 3-7):
- Identify the EXACT bullet point, skill category, or summary to change
- Provide a REWRITTEN version that naturally incorporates missing keywords
- currentText MUST match the resume EXACTLY:
    - For "experience" or "projects": pick the exact bullet text.
    - For "skills": use the EXACT category label (e.g. "Languages", "Frameworks").
    - For "summary": use the EXACT existing professional summary text.
- Rewrites must be truthful — never fabricate experience or skills
- Each rewrite must be specific, quantified where possible, action-verb-led
- Explain WHY this change improves ATS compatibility
- Do NOT simplify or shorten bullet points — make them MORE detailed and keyword-rich"""

    return await _call_model_json(prompt, user_id=user_id, operation="analyze_and_recommend")


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
    }},
    {{
      "type": "certifications",
      "items": [
        {{
          "name": "Certification Title",
          "issuer": "Issuing Organization",
          "year": "2024",
          "link": "https://credential-url.com or empty string",
          "description": "One-line description or empty string"
        }}
      ]
    }}
  ]
}}

Rules:
- Include ALL sections from the resume (only include section types that exist in the resume)
- For certifications: extract every certificate, license, or professional credential listed in the resume
- If no certifications exist in the resume, omit the certifications section entirely
- Multiple experience entries should each be their own experience object in the sections array
- Keep bullets truthful and intact — do not paraphrase
- If a field is not present in the resume, use an empty string
- Return ONLY the JSON, no markdown, no explanation"""

    return await _call_model_json(prompt, user_id=user_id, operation="parse_resume_pdf")


async def call_model_json(prompt: str, user_id: str = "", operation: str = "", model_override: str = None) -> dict | list:
    """
    Public wrapper for JSON model calls.
    Allows specifying a model_override (e.g. for Gemini Flash).
    """
    return await _call_model_json(prompt, user_id=user_id, operation=operation, model_override=model_override)


async def _call_model_json(prompt: str, user_id: str = "", operation: str = "", model_override: str = None) -> dict | list:
    """Call Gemma model expecting JSON output. Retries once with 2s sleep. Logs token usage."""
    client = _get_client()
    target_model = model_override if model_override else MODEL

    for attempt in range(2):
        try:
            t0 = time.monotonic()
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=target_model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "temperature": 0.3,
                },
            )
            latency_ms = (time.monotonic() - t0) * 1000
            
            raw_text = response.text
            cleaned_text = _clean_json_response(raw_text)
            parsed_json = json.loads(cleaned_text)

            # Log token usage (fire-and-forget) - ONLY AFTER SUCCESSFUL PARSING
            if user_id:
                meta = response.usage_metadata
                _fire_log(
                    user_id=user_id,
                    operation=operation,
                    input_tokens=getattr(meta, "prompt_token_count", 0) or 0,
                    output_tokens=getattr(meta, "candidates_token_count", 0) or 0,
                    latency_ms=latency_ms,
                )

            return parsed_json
        except Exception as e:
            # Detect transient errors (overload, rate limit, timeout)
            is_transient, is_timeout = is_ai_transient_error(e)
            
            # If JSON parsing failed, also check the raw response text if available
            # Overloads often return a plain text error page instead of JSON
            if not is_transient and isinstance(e, json.JSONDecodeError):
                # We need to get the raw response text from the scope if possible
                # But since we're in the try block, we can check the 'raw_text' variable if it was set
                if 'raw_text' in locals():
                    is_transient, is_timeout = is_ai_transient_error(locals()['raw_text'])

            if is_transient:
                if attempt == 0:
                    await asyncio.sleep(2)
                    continue
                
                msg = "Our AI took too long to respond. Please try again." if is_timeout else \
                      "The Google AI service is currently overloaded. Please try again in a few moments."
                raise GemmaOverloadError(message=msg, status_code=504 if is_timeout else 503, is_timeout=is_timeout)
            
            if attempt == 0:
                await asyncio.sleep(2)
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
            result_text = response.text.strip()

            # Log token usage (fire-and-forget) - ONLY AFTER SUCCESSFUL RETRIEVAL
            if user_id:
                meta = response.usage_metadata
                _fire_log(
                    user_id=user_id,
                    operation=operation,
                    input_tokens=getattr(meta, "prompt_token_count", 0) or 0,
                    output_tokens=getattr(meta, "candidates_token_count", 0) or 0,
                    latency_ms=latency_ms,
                )

            return result_text
        except Exception as e:
            # Detect transient errors (overload, rate limit, timeout)
            is_transient, is_timeout = is_ai_transient_error(e)

            if is_transient:
                if attempt == 0:
                    await asyncio.sleep(2)
                    continue
                
                msg = "Our AI took too long to respond. Please try again." if is_timeout else \
                      "The Google AI service is currently overloaded. Please try again in a few moments."
                raise GemmaOverloadError(message=msg, status_code=504 if is_timeout else 503, is_timeout=is_timeout)
            
            if attempt == 0:
                await asyncio.sleep(2)
            else:
                raise


def classify_company_tier(company_name: str) -> dict:
    """
    Classify company into an interview tier based on name.
    Returns a dict with tier label and interview style descriptor.
    No API call — pure string matching against known companies.
    Falls back to 'standard' for unknown companies.
    """
    if not company_name:
        return _tier_config("standard")

    name = company_name.lower().strip()

    # FAANG + adjacent Big Tech
    faang_and_big_tech = {
        "google", "alphabet", "deepmind", "meta", "facebook", "instagram",
        "whatsapp", "amazon", "aws", "apple", "netflix", "microsoft", "msft",
        "linkedin", "openai", "anthropic", "nvidia", "tesla", "x.com", "twitter",
        "uber", "lyft", "airbnb", "stripe", "palantir", "salesforce", "adobe",
        "oracle", "ibm", "intel", "qualcomm", "snap", "pinterest", "spotify",
        "shopify", "atlassian", "datadog", "snowflake", "databricks", "coinbase",
        "robinhood", "doordash", "instacart", "bytedance", "tiktok",
        # Indian Big Tech
        "google india", "microsoft india", "amazon india", "flipkart", "meesho",
        "phonepe", "paytm", "razorpay", "groww", "zerodha", "zomato", "swiggy",
        "ola", "nykaa", "cred", "unacademy", "byju", "freshworks", "zoho",
    }

    # Well-funded unicorns / large public tech companies
    unicorn_tier = {
        "twilio", "twitch", "figma", "notion", "airtable", "vercel", "supabase",
        "hashicorp", "confluent", "elastic", "gitlab", "github", "docker",
        "cloudflare", "fastly", "segment", "mixpanel", "amplitude", "intercom",
        "hubspot", "zendesk", "pagerduty", "splunk", "new relic", "dynatrace",
        "mongodb", "redis", "cockroachdb", "planetscale", "neon", "railway",
        # Indian unicorns
        "infosys", "wipro", "tcs", "hcl", "accenture", "capgemini", "cognizant",
        "mphasis", "persistent", "ltimindtree", "safe security", "druva",
        "postman", "browserstack", "chargebee", "clevertap", "lenskart",
    }

    # Check FAANG tier first (exact word match within name)
    for company in faang_and_big_tech:
        if company in name or name in company:
            return _tier_config("faang")

    # Check unicorn/large tier
    for company in unicorn_tier:
        if company in name or name in company:
            return _tier_config("unicorn")

    # Default: standard tier
    return _tier_config("standard")


def _tier_config(tier: str) -> dict:
    """Returns interview style config for a given tier."""
    configs = {
        "faang": {
            "tier":           "faang",
            "label":          "FAANG / Big Tech",
            "depthLevel":     "expert",
            "styleGuide":     (
                "This is a FAANG-level interview. Questions must reflect the bar "
                "Google, Meta, Amazon, or Microsoft actually set. Specifically:\n"
                "- Questions probe DEPTH, not just familiarity. 'Have you used X?' "
                "is never the question. 'Design X at 10M users' or 'what breaks first "
                "in X under load?' is the question.\n"
                "- Include a realistic follow-up sub-question inside the question "
                "itself that a good interviewer would pivot to after the first answer.\n"
                "- For Amazon: frame at least one question around an LP (Leadership "
                "Principle) like 'Tell me about a time you disagreed with your team "
                "on a technical decision and pushed back with data.'\n"
                "- For system design gaps: the question must include a scale or "
                "constraint e.g. '...that handles 500k requests/second with p99 "
                "latency under 50ms.'\n"
                "- Strategic answers must acknowledge the gap honestly but pivot "
                "to demonstrable depth in adjacent systems."
            ),
            "difficultyBias": "hard",
        },
        "unicorn": {
            "tier":           "unicorn",
            "label":          "Unicorn / Large Tech",
            "depthLevel":     "senior",
            "styleGuide":     (
                "This is a well-funded tech company or large enterprise tech interview. "
                "Questions should reflect a senior bar without being purely theoretical:\n"
                "- Questions focus on real delivery experience, not just knowledge. "
                "'Tell me about a production incident you owned end to end' style.\n"
                "- Include one question that tests cross-functional awareness: "
                "how the candidate communicated a technical decision to non-engineers.\n"
                "- Avoid purely academic or algorithm-focused questions unless the "
                "role is clearly algorithm-heavy.\n"
                "- Strategic answers should show ownership and business impact, "
                "not just technical correctness."
            ),
            "difficultyBias": "medium",
        },
        "standard": {
            "tier":           "standard",
            "label":          "Tech Company",
            "depthLevel":     "mid",
            "styleGuide":     (
                "This is a standard tech company interview (startup to mid-size). "
                "Questions should be practical and direct:\n"
                "- Focus on whether the candidate can actually do the job, not "
                "theoretical edge cases.\n"
                "- Questions test problem-solving approach and hands-on experience "
                "more than scale or system design depth.\n"
                "- Include one question about how the candidate learns new technologies "
                "quickly (relevant since they have a gap).\n"
                "- Strategic answers should emphasize speed of learning and "
                "transferable practical skills."
            ),
            "difficultyBias": "medium",
        },
    }
    return configs.get(tier, configs["standard"])


async def generate_interview_prep(
    missing_keywords: list[str],
    resume_summary:   str,
    job_title:        str,
    company:          str,
    company_tier:     dict = None,
    user_id:          str = "",
) -> list[dict]:
    """
    Predict likely interview questions based on resume gaps and company tier.
    Returns list of { gap, question, strategicAnswer, difficulty, companyTier, companyLabel }
    """
    if company_tier is None:
        company_tier = classify_company_tier(company)

    # Convert missing keywords to a list of gaps
    gaps = missing_keywords[:3]  # Focus on top 3 gaps
    if not gaps:
        gaps = ["General technical proficiency and role alignment"]

    gaps_formatted = "\n".join([f"- {gap}" for gap in gaps])

    prompt = f"""You are a senior technical interviewer and career coach specializing in {company_tier['label']} interviews.

INTERVIEW CONTEXT:
  Company: {company}
  Company tier: {company_tier['label']}
  Role: {job_title}
  Interview depth level: {company_tier['depthLevel']}

INTERVIEW STYLE INSTRUCTIONS:
{company_tier['styleGuide']}

CANDIDATE BACKGROUND (from their resume):
{resume_summary}

RESUME GAPS TO PROBE:
{gaps_formatted}

For each gap listed above, generate one interview question and one coached strategic answer.

CRITICAL RULES FOR ALL QUESTIONS:
- Questions must sound EXACTLY like what a real interviewer at {company} would ask — not generic, not textbook, specific to this company's known engineering culture and scale
- Questions must expose the specific gap without being obviously confrontational ("I see you don't have X" is never how interviewers phrase it)
- Strategic answers MUST use the candidate's actual resume experience — never suggest experience they did not demonstrate

Return ONLY valid JSON — an array of exactly {len(gaps)} objects.
No markdown, no explanation, raw JSON only.

[
  {{
    "gap": "the exact gap skill or requirement",
    "question": "The interviewer's question, written exactly as they would say it in the actual interview. For {company_tier['label']} interviews this should be {company_tier['depthLevel']}-level. Include a follow-up sub-question if appropriate for this tier.",
    "strategicAnswer": "A 3-4 sentence coached answer. Must:
                        1. Open with honesty about the gap without being defensive
                        2. Pivot immediately to the closest relevant experience from the candidate's actual resume
                        3. Show genuine enthusiasm to close the gap
                        4. Sound natural for a {company_tier['label']} interview bar",
    "difficulty": "{company_tier['difficultyBias']} — adjust per gap severity",
    "companyTier": "{company_tier['tier']}",
    "companyLabel": "{company_tier['label']}"
  }}
]"""

    return await _call_model_json(prompt, user_id=user_id, operation="generate_interview_prep")
