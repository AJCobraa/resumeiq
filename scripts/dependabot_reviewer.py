"""
dependabot_reviewer.py

AI-powered safety reviewer for Dependabot pull requests.
Posts a structured analysis comment and fails CI when the verdict is BLOCK.
"""

import os
import sys
import time
import requests
from google import genai
from google.genai import types, errors

# ── Configuration ──────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN")
REPO           = os.environ.get("REPO")
PR_NUMBER      = os.environ.get("PR_NUMBER")
PR_TITLE       = os.environ.get("PR_TITLE", "Untitled PR")
OSV_PATH       = os.environ.get("OSV_RESULTS", "/tmp/osv_results.txt")

# Verified model strings — ordered best→fallback.
# gemini-2.5-flash is tried first; older stable models follow as fallbacks.
MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]

MAX_DIFF_CHARS = 40_000   # ~10k tokens; stays well within context limits
HTTP_TIMEOUT   = 15       # seconds for GitHub API calls

# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
You are a Staff-Level Dependency Safety Reviewer for ResumeIQ.
Your job is to assess whether an automated Dependabot version bump is SAFE TO MERGE.

## ANALYSIS CRITERIA
1. **Semver Risk** — patch (generally safe), minor (check deprecations), major (HIGH RISK).
2. **CVE / OSV Scan** — interpret the provided OSV results.
   Does this version fix or introduce known security vulnerabilities?
3. **Breaking Changes** — are there known API or behaviour changes for this version?
4. **License** — flag if the license changed to a restrictive type (GPL / AGPL / SSPL / Commons Clause).
5. **Stack Impact** — will this break FastAPI, Pydantic, React, or Vite?

## RESPONSE FORMAT  (use exactly these headings)
### 📦 Package Update Summary
### 🛡️ Security & OSV Scan Analysis
### ⚙️ Breaking Changes & Stack Impact
### ✅ Safety Assessment
### 🔖 Verdict: SAFE TO MERGE | REVIEW MANUALLY | BLOCK

The final line of your response MUST be exactly one of:
  VERDICT: SAFE TO MERGE
  VERDICT: REVIEW MANUALLY
  VERDICT: BLOCK
"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def read_file_safe(path: str, fallback: str = "") -> str:
    """Read a file; return fallback string if it doesn't exist."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return fallback


def truncate_diff(diff: str, max_chars: int = MAX_DIFF_CHARS) -> str:
    """Truncate diff at a clean line boundary to avoid splitting mid-hunk."""
    if len(diff) <= max_chars:
        return diff
    truncated = diff[:max_chars].rsplit("\n", 1)[0]
    print(f"⚠️  Diff truncated: {len(diff)} → {len(truncated)} chars")
    return truncated + "\n\n[... Diff truncated for token safety ...]"


def parse_verdict(text: str) -> str:
    """
    Extract the structured verdict from the last line of the AI response.
    Returns one of: 'SAFE TO MERGE', 'REVIEW MANUALLY', 'BLOCK', or 'UNKNOWN'.
    """
    for line in reversed(text.strip().splitlines()):
        line = line.strip().upper()
        if line.startswith("VERDICT:"):
            verdict = line.replace("VERDICT:", "").strip()
            if verdict in ("SAFE TO MERGE", "REVIEW MANUALLY", "BLOCK"):
                return verdict
    # Fallback: scan full text for the keywords (handles minor formatting drift)
    upper = text.upper()
    if "VERDICT: BLOCK" in upper:
        return "BLOCK"
    if "VERDICT: REVIEW MANUALLY" in upper:
        return "REVIEW MANUALLY"
    if "VERDICT: SAFE TO MERGE" in upper:
        return "SAFE TO MERGE"
    return "UNKNOWN"

# ── Core logic ────────────────────────────────────────────────────────────────

def review_dependabot() -> tuple[str, str]:
    """
    Call the Gemini API with a fallback chain of models.
    Returns (review_text, model_name_used).
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    diff        = read_file_safe("/tmp/pr_diff.txt")
    osv_output  = read_file_safe(OSV_PATH, fallback="No OSV scan results available.")

    if not diff:
        print("❌ /tmp/pr_diff.txt is empty or missing — nothing to review.")
        sys.exit(1)

    diff = truncate_diff(diff)

    user_message = (
        f"PR Title: {PR_TITLE}\n\n"
        f"### OSV / CVE Scan Results\n{osv_output}\n\n"
        f"### PR Diff\n{diff}"
    )

    for attempt, model_name in enumerate(MODELS_TO_TRY):
        try:
            print(f"🤖 Attempting review with {model_name} ...")
            response = client.models.generate_content(
                model=model_name,
                contents=[user_message],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,  # correct field — not passed as a user turn
                    temperature=0.1,
                ),
            )
            print(f"✅ Success with {model_name}")
            return response.text, model_name

        except (errors.ServerError, errors.ClientError) as exc:
            # Only retry on rate-limit (429) or temporary unavailability (503)
            status = getattr(exc, "status_code", None)
            if status in (429, 503):
                backoff = 2 ** attempt          # 1s, 2s, 4s …
                print(f"⚠️  {model_name} returned {status}. Retrying in {backoff}s …")
                time.sleep(backoff)
                continue
            # Any other error is a real problem — surface it immediately
            print(f"❌ Unrecoverable error with {model_name}: {exc}")
            sys.exit(1)

    print("🚨 All fallback models exhausted.")
    sys.exit(1)


def post_github_comment(text: str, model_used: str, verdict: str) -> None:
    """Post the AI review as a comment on the PR."""
    verdict_emoji = {
        "SAFE TO MERGE":   "✅",
        "REVIEW MANUALLY": "⚠️",
        "BLOCK":           "🚫",
    }.get(verdict, "❓")

    body = (
        f"## 🤖 Dependabot Safety Check\n\n"
        f"{text}\n\n"
        f"---\n"
        f"**{verdict_emoji} Final Verdict: {verdict}**  \n"
        f"*Reviewed by: `{model_used}`*"
    )

    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    try:
        res = requests.post(url, json={"body": body}, headers=headers, timeout=HTTP_TIMEOUT)
    except requests.Timeout:
        print("❌ GitHub API request timed out.")
        sys.exit(1)

    if res.status_code != 201:
        print(f"❌ Failed to post comment (HTTP {res.status_code}): {res.text}")
        sys.exit(1)

    print(f"✅ Review comment posted to PR #{PR_NUMBER}")

# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Validate required environment variables before doing any work
    required = {
        "GOOGLE_AI_STUDIO_API_KEY": GEMINI_API_KEY,
        "GITHUB_TOKEN":             GITHUB_TOKEN,
        "REPO":                     REPO,
        "PR_NUMBER":                PR_NUMBER,
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        sys.exit(1)

    # Run the review
    review_text, model_id = review_dependabot()
    verdict = parse_verdict(review_text)

    print(f"📋 Parsed verdict: {verdict}")

    # Always post the comment so the reviewer can read the analysis
    post_github_comment(review_text, model_id, verdict)

    # Enforce the verdict as a CI gate
    if verdict == "BLOCK":
        print("🚫 AI verdict is BLOCK — failing the workflow to prevent merge.")
        sys.exit(1)

    if verdict == "UNKNOWN":
        print("❓ Could not parse a structured verdict — failing safely.")
        sys.exit(1)

    if verdict == "REVIEW MANUALLY":
        print("⚠️  AI verdict is REVIEW MANUALLY — a human must approve before merge.")
        # Exit 0 so CI passes, but the comment on the PR makes the requirement clear.
        # Change to sys.exit(1) if you want to enforce a hard block here too.

    print("✅ Dependabot safety check complete.")
