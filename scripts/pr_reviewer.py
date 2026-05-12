import os
import sys
import requests
from google import genai
from google.genai import types

# ── Configuration ──────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO = os.environ.get("REPO")
PR_NUMBER = os.environ.get("PR_NUMBER")
PR_TITLE = os.environ.get("PR_TITLE", "Untitled PR")
PR_AUTHOR = os.environ.get("PR_AUTHOR", "Unknown")

def review_security():
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    try:
        with open("/tmp/pr_diff.txt", "r") as f:
            diff = f.read()
    except FileNotFoundError:
        print("❌ Error: /tmp/pr_diff.txt not found.")
        sys.exit(1)

    if len(diff) > 80000:
        diff = diff[:80000] + "\n\n[... Diff truncated ...]"

    system_prompt = """
    You are a Senior DevSecOps Engineer for ResumeIQ. 
    ENFORCE THESE ARCHITECTURE RULES:
    1. Database: Use ONLY PostgreSQL. Never suggest Firestore. 
    2. JSONB: 'resume_data' uses JSONB. Indexed fields (role, company) must be top-level columns.
    3. pgvector: Use Vector(3072) for gemini-embedding-001.
    4. Budget Guard: 'backend/core/budget_guard.py' must use 'SELECT ... FOR UPDATE' row-level locks.
    5. Auth: UID must come from 'verify_token'. Never trust user_id from a request body.
    6. Security: Flag hardcoded keys (AIza...), passwords, or raw SQL strings.

    FORMAT:
    - ✅ Architecture Alignment
    - 🚨 Critical Security/DB Issues
    - 📊 Verdict: APPROVE | REQUEST CHANGES | BLOCK
    """

    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=[system_prompt, f"PR: {PR_TITLE} by {PR_AUTHOR}\n\nDiff:\n{diff}"],
        config=types.GenerateContentConfig(temperature=0.2)
    )
    return response.text

def post_comment(text):
    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    body = {"body": f"## 🛡️ DevSecOps Review\n\n{text}\n\n---\n*Enforcing ResumeIQ Architecture Rules*"}
    
    res = requests.post(url, json=body, headers=headers)
    if res.status_code != 201:
        print(f"❌ Failed to post: {res.text}")
        sys.exit(1)

if __name__ == "__main__":
    if not all([GEMINI_API_KEY, GITHUB_TOKEN, REPO, PR_NUMBER]):
        print("❌ Missing environment variables.")
        sys.exit(1)
    review_text = review_security()
    post_comment(review_text)
