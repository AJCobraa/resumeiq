import os
import sys
import requests
from google import genai
from google.genai import types

# ── Environment Variables ──────────────────────────────────
GEMINI_API_KEY = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO = os.environ.get("REPO")
PR_NUMBER = os.environ.get("PR_NUMBER")
PR_TITLE = os.environ.get("PR_TITLE", "Untitled PR")
PR_AUTHOR = os.environ.get("PR_AUTHOR", "Unknown")

def review_performance():
    """Analyzes the PR diff specifically for Performance and Code Quality."""
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    try:
        with open("/tmp/pr_diff.txt", "r") as f:
            diff = f.read()
    except FileNotFoundError:
        print("❌ Error: /tmp/pr_diff.txt not found.")
        sys.exit(1)

    # Context Limit Safety Guard
    if len(diff) > 80000:
        diff = diff[:80000] + "\n\n[... Diff truncated for length ...]"

    system_prompt = """
    You are a Senior Performance Architect for ResumeIQ.
    Review the diff for:
    1. Async Hygiene: Flag blocking I/O (time.sleep, requests) in async functions. Suggest httpx/aiofiles.
    2. SQL Efficiency: Flag N+1 queries. Ensure 'selectinload' or 'joinedload' is used.
    3. Readability: Ensure all FastAPI routes have type hints. Flag functions > 40 lines.
    4. Edge Cases: Handling of 0 coin balances or empty PDF parses.

    FORMAT:
    - 🚀 Performance Audit
    - 🧹 Readability & Clean Code
    - 🐛 Logic Edge Cases
    - 💡 Verdict: CLEAN | NEEDS REFACTOR
    """

    print(f"Starting Performance Review for PR #{PR_NUMBER}...")
    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=[system_prompt, f"PR: {PR_TITLE} by {PR_AUTHOR}\n\nDiff:\n{diff}"],
        config=types.GenerateContentConfig(temperature=0.2)
    )
    return response.text

def post_comment(text):
    """Posts the review as a comment to the GitHub PR."""
    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    body = {"body": f"### ⚡ Performance & Quality Audit\n\n{text}\n\n---\n*Automated by Gemini 2.0 Flash*"}
    
    res = requests.post(url, json=body, headers=headers)
    if res.status_code != 201:
        print(f"❌ Failed to post comment: {res.status_code} - {res.text}")
        sys.exit(1)
        
    print(f"✅ Performance review posted to PR #{PR_NUMBER}")

if __name__ == "__main__":
    if not all([GEMINI_API_KEY, GITHUB_TOKEN, REPO, PR_NUMBER]):
        print("❌ Missing required environment variables.")
        sys.exit(1)
        
    review_text = review_performance()
    post_comment(review_text)
