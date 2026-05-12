import os
import sys
import requests
import time
from google import genai
from google.genai import types, errors

# ── Configuration & Environment Guard ──────────────────────
GEMINI_API_KEY = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO = os.environ.get("REPO")
PR_NUMBER = os.environ.get("PR_NUMBER")
PR_TITLE = os.environ.get("PR_TITLE", "Untitled PR")
OSV_PATH = os.environ.get("OSV_RESULTS", "/tmp/osv_results.txt")

# Updated to use guaranteed valid model strings from your quota
MODELS_TO_TRY = [
    "gemini-3.1-flash-lite", 
    "gemini-1.5-flash", 
    "gemini-2.5-flash-lite", 
    "gemma-3-27b"
]

def review_dependabot():
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # 1. Read the PR Diff
    try:
        with open("/tmp/pr_diff.txt", "r") as f:
            diff = f.read()
    except FileNotFoundError:
        print("❌ Error: /tmp/pr_diff.txt not found.")
        sys.exit(1)

    # 2. Read the OSV Scan Results
    try:
        with open(OSV_PATH, "r") as f:
            osv_output = f.read()
    except FileNotFoundError:
        osv_output = "No OSV scan results available for this PR."

    if len(diff) > 40000:
        diff = diff[:40000] + "\n\n[... Diff truncated for safety ...]"

    system_prompt = """
    You are a Staff-Level Dependency Safety Reviewer for ResumeIQ.
    Assess if this AUTOMATED Dependabot version bump is SAFE TO MERGE.

    ## ANALYSIS CRITERIA:
    1. Semver Risk: patch (safe), minor (check deprecations), major (HIGH RISK).
    2. CVE Scan: Interpret the provided OSV results. Does this version fix or introduce security holes?
    3. Breaking Changes: Are there known API changes for this package version?
    4. License: Flag if the license changed to a restrictive type (GPL/AGPL/SSPL).
    5. Stack Impact: Will this break FastAPI, Pydantic, React, or Vite?

    FORMAT:
    ### 📦 Package Update Summary
    ### 🛡️ Security & OSV Scan Analysis
    ### ✅ Safety Assessment
    ### 🔖 Verdict: SAFE TO MERGE | REVIEW MANUALLY | BLOCK
    """

    for model_name in MODELS_TO_TRY:
        try:
            print(f"🤖 Dependabot Agent: Attempting with {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    system_prompt, 
                    f"PR: {PR_TITLE}\n\nCVE Scan Results:\n{osv_output}\n\nDiff:\n{diff}"
                ],
                config=types.GenerateContentConfig(temperature=0.1)
            )
            print(f"✅ Success with {model_name}!")
            return response.text, model_name
        except (errors.ServerError, errors.ClientError) as e:
            if any(code in str(e) for code in ["429", "503"]):
                print(f"⚠️ {model_name} busy. Trying fallback...")
                time.sleep(2)
                continue
            print(f"❌ Error with {model_name}: {e}")
            sys.exit(1)
    
    print("🚨 All fallback models failed.")
    sys.exit(1)

def post_comment(text, model_used):
    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    body = {"body": f"## 🤖 Dependabot Safety Check\n\n{text}\n\n---\n*Reviewed by: {model_used}*"}
    res = requests.post(url, json=body, headers=headers)
    if res.status_code != 201:
        print(f"❌ Failed to post comment: {res.text}")
        sys.exit(1)
    print(f"✅ Dependabot review posted to PR #{PR_NUMBER}")

if __name__ == "__main__":
    # Detailed Environment Guard
    missing = [k for k, v in {
        "GOOGLE_AI_STUDIO_API_KEY": GEMINI_API_KEY,
        "GITHUB_TOKEN": GITHUB_TOKEN,
        "REPO": REPO,
        "PR_NUMBER": PR_NUMBER,
    }.items() if not v]
    
    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        sys.exit(1)

    review_text, model_id = review_dependabot()
    post_comment(review_text, model_id)
