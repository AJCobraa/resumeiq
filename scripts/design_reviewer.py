"""
design_reviewer.py — Design & Simplicity Agent

Answers the question the other two agents don't ask:
  "Was there a simpler, cleaner way to solve this?"

Checks for: over-engineering, unnecessary abstractions, YAGNI violations,
reinvented stdlib, convoluted control flow, and change-specific design concerns.
"""

import os
import sys
import time
import requests
from google import genai
from google.genai import types, errors

# ── Config ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN")
REPO           = os.environ.get("REPO")
PR_NUMBER      = os.environ.get("PR_NUMBER")
PR_TITLE       = os.environ.get("PR_TITLE", "Untitled PR")
PR_AUTHOR      = os.environ.get("PR_AUTHOR", "Unknown")

MODELS_TO_TRY = [
    "gemini-3.1-flash-lite",  # Best quality available; use first
    "gemini-3.0-flash", # Fast, strong fallback
    "gemini-2.5-flash",    
    "gemini-1.5-flash",
    "gemma-3-27b"  # Reliable last resort
]
MAX_DIFF_CHARS = 1_000_000

SYSTEM_PROMPT = """
You are a Principal Engineer and Tech Lead doing a design & simplicity review
for ResumeIQ — a FastAPI + PostgreSQL + pgvector SaaS application.

You are NOT reviewing security (separate agent) or runtime performance (separate agent).
Your sole job is to evaluate whether the code changes are well-designed and
appropriately simple for the problem being solved.

Core question for every changed function or module:
  "Is this the simplest correct solution, or did the author over-think it?"

────────────────────────────────────────────────
# WHAT TO CHECK
────────────────────────────────────────────────

## 1. Over-Engineering & Unnecessary Abstraction
Flag when a change introduces abstraction layers that aren't justified by
current requirements (YAGNI — You Aren't Gonna Need It):

- New base classes, mixins, or metaclasses with only one concrete subclass
- Strategy/Factory/Registry patterns applied to logic that has exactly one variant
- Configuration objects or builder chains for a value that could be a constant
- Generic utility functions parameterised for flexibility that is never used
- New modules or files created to hold a single small function

Suggested question: "If we deleted this abstraction and inlined the logic, would
anything break or become harder to read?" If no → flag it.

## 2. Simpler Alternatives Overlooked
Flag when the diff reinvents something Python / FastAPI / SQLAlchemy already provides:

Python stdlib / builtins
- Manual dict-merging loops → {**a, **b} or a | b (Python 3.9+)
- Manual list filtering loops → list comprehensions or filter()
- Manual string building loops → str.join()
- Custom retry logic → tenacity library (already in most FastAPI stacks)
- Custom singleton → functools.lru_cache or module-level variable
- Custom LRU cache → functools.lru_cache / functools.cache
- Custom pagination math → already handled by FastAPI-Pagination or sqlalchemy offset/limit helpers

FastAPI
- Manual response dict construction when a Pydantic model would handle it
- Manual query param parsing when FastAPI Depends() would be cleaner
- Reimplementing dependency injection inside a route function body
- Manual background threading when BackgroundTasks is available

SQLAlchemy
- Raw SQL string for something ORM already models cleanly
- Manual relationship traversal instead of configured relationship + lazy/eager load
- Manual INSERT loop instead of session.add_all()

## 3. Convoluted Control Flow
Flag when logic is harder to follow than necessary:

- Deeply nested if/else that could be flattened with early returns / guard clauses
- Chains of boolean flags set across multiple lines that could be a single expression
- State machines implemented as nested conditionals instead of a dict/enum dispatch
- Exception used for normal flow control (raising to break out of a loop)
- Multiple return paths with slightly different data shapes — unify the return type
- Code that needs a comment to explain WHAT it does (not why) — the code itself should be clear

## 4. Change Proportionality
For each modified function or class, assess whether the change matches the stated PR goal:

- Was a 5-line fix done with 50 lines of new infrastructure?
- Does the PR add new abstractions that aren't exercised by the PR's own changes?
- Does a bug fix also refactor unrelated logic (scope creep — harder to review, risky)?
- Does a "minor update" PR actually rewrite a core module? Flag for team awareness.

## 5. DRY Violations Introduced by the Change
- Does the diff copy-paste logic that already exists elsewhere in the codebase
  (visible from the diff context lines)?
- Does the diff duplicate a helper function that could be shared?
- Are identical validation rules written twice for two different endpoints?

## 6. Deleted Simplicity
Flag when a PR replaces simple working code with something more complex:
- Previous version: 10 lines. New version: 40 lines. Does the complexity buy anything?
- Simple conditional replaced by a class hierarchy for one behaviour change
- A readable function split into many tiny functions that are only called once
  (micro-fragmentation — hurts readability more than it helps)

## 7. Naming That Hides Complexity
- A simple getter named `process_`, `handle_`, `manage_` suggesting more responsibility
- A class named Manager, Handler, Processor, Coordinator — usually a sign of mixed responsibilities
- Misleadingly simple names on complex functions (get_user that also creates a user)

────────────────────────────────────────────────
# REVIEW GUIDELINES
────────────────────────────────────────────────
- Only flag issues clearly evidenced in the diff — do not invent hypotheticals
- For every flag, show the simpler alternative explicitly (a short code sketch is ideal)
- Acknowledge when a change is appropriately complex for the problem it solves
- This review is constructive — the goal is cleaner code, not blocking the PR
- If the diff is clean for a category, confirm it was checked

────────────────────────────────────────────────
# OUTPUT FORMAT
────────────────────────────────────────────────

## 🏗️ Design & Abstraction Issues
For each issue:
- **Severity**: LOW | MEDIUM | HIGH
- **Location**: file & function (if visible)
- **Problem**: what is over-engineered or misdesigned
- **Simpler Alternative**: concrete suggestion or code sketch
- **Trade-off**: what would be lost (if anything) by simplifying

## 🔁 DRY & Duplication Issues
List duplicated logic with location and extraction suggestion.

## 🌀 Control Flow Complexity
List convoluted flows with a cleaner alternative.

## 📐 Change Proportionality Assessment
One paragraph: does the size and complexity of this PR match the stated goal?
Flag scope creep or over-engineering explicitly.

## ✅ Positive Design Findings
Highlight clean design decisions, good use of existing patterns, or well-scoped changes.

## 💡 Final Verdict
`WELL-SCOPED` | `OVER-ENGINEERED` | `NEEDS SIMPLIFICATION`
One-sentence justification.
"""


def read_diff() -> str:
    try:
        with open("/tmp/pr_diff.txt", "r", encoding="utf-8", errors="replace") as f:
            diff = f.read()
    except FileNotFoundError:
        print("❌ Error: /tmp/pr_diff.txt not found.")
        sys.exit(1)

    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[... Diff truncated for length ...]"
        print(f"⚠️  Diff truncated to {MAX_DIFF_CHARS:,} characters.")
    else:
        print(f"📄 Diff size: {len(diff):,} characters.")

    return diff


def review_design() -> tuple[str, str]:
    client = genai.Client(api_key=GEMINI_API_KEY)
    diff   = read_diff()

    user_message = (
        f"PR: **{PR_TITLE}** by `{PR_AUTHOR}`\n\n"
        f"```diff\n{diff}\n```"
    )

    backoff = 2

    for model_name in MODELS_TO_TRY:
        try:
            print(f"🤖 Design Agent: trying {model_name} ...")
            response = client.models.generate_content(
                model=model_name,
                contents=[SYSTEM_PROMPT, user_message],
                config=types.GenerateContentConfig(temperature=0.3),
            )
            print(f"✅ Success with {model_name}.")
            return response.text, model_name

        except (errors.ServerError, errors.ClientError) as exc:
            err_str = str(exc)
            if any(code in err_str for code in ("429", "503")):
                print(f"⚠️  {model_name} rate-limited / busy — waiting {backoff}s then falling back ...")
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
                continue
            print(f"❌ Non-retryable error with {model_name}: {exc}")
            sys.exit(1)

    print("🚨 All models exhausted. Cannot complete design review.")
    sys.exit(1)


def post_comment(text: str, model_used: str) -> None:
    url = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = {
        "body": (
            f"### 🏗️ Design & Simplicity Review\n\n"
            f"{text}\n\n"
            f"---\n"
            f"*Reviewed by `{model_used}` · Design Agent*"
        )
    }

    res = requests.post(url, json=body, headers=headers, timeout=30)
    if res.status_code != 201:
        print(f"❌ Failed to post comment: HTTP {res.status_code} — {res.text}")
        sys.exit(1)

    print(f"✅ Design review posted to PR #{PR_NUMBER}.")


if __name__ == "__main__":
    missing = [v for v in ("GOOGLE_AI_STUDIO_API_KEY", "GITHUB_TOKEN", "REPO", "PR_NUMBER")
               if not os.environ.get(v)]
    if missing:
        print(f"❌ Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    review_text, model_id = review_design()
    post_comment(review_text, model_id)
