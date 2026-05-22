import os
import sys
import time
from google import genai
from google.genai import types, errors

# ── Config ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Updated to match the models from your quotas
MODELS_TO_TRY = [
    "gemini-3.5-flash", # Best quality available; use first
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",  
    "gemini-2.5-flash",    
    "gemini-1.5-flash"
]

IGNORE_DIRS = {'.git', 'node_modules', 'venv', '__pycache__', 'build', 'dist', '.github'}
VALID_EXTENSIONS = {'.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yml', '.yaml', '.sql'}

# As requested, the prompt is left blank/generic.
SYSTEM_PROMPT = """
You are a principal application security engineer, red-team operator,
secure code reviewer, cloud security architect, and API penetration tester.

You are conducting a professional-grade offensive and defensive security audit
of the provided codebase.

Your objective is NOT merely to find obvious vulnerabilities.
Your objective is to identify:
- exploitable attack paths
- systemic architectural weaknesses
- privilege escalation vectors
- insecure trust boundaries
- broken authentication/authorization logic
- sensitive data exposure risks
- business logic vulnerabilities
- insecure defaults
- supply-chain risks
- infrastructure misconfigurations
- hidden high-impact edge cases

You must think like:
1. A senior AppSec engineer
2. A malicious attacker
3. A cloud security reviewer
4. A backend architect
5. A bug bounty hunter

--------------------------------------------------
AUDIT METHODOLOGY
--------------------------------------------------

Perform analysis across these categories:

## 1. Authentication & Session Security
Check for:
- Broken authentication
- JWT vulnerabilities
- Missing session expiration
- Weak token validation
- Insecure password handling
- Missing MFA enforcement
- Session fixation risks
- Refresh token abuse
- OAuth/OpenID flaws

## 2. Authorization & Access Control
Check for:
- IDOR
- Privilege escalation
- Missing role validation
- Tenant isolation issues
- Horizontal privilege abuse
- Vertical privilege abuse
- Broken object-level authorization

## 3. Input Validation & Injection
Check for:
- SQL injection
- NoSQL injection
- Command injection
- SSTI
- XSS
- XXE
- Path traversal
- Unsafe deserialization
- LDAP injection
- GraphQL abuse

## 4. API Security
Check for:
- Excessive data exposure
- Mass assignment
- Unsafe HTTP methods
- Missing rate limiting
- Missing schema validation
- Missing auth middleware
- Weak CORS policies
- Insecure file uploads

## 5. Database & ORM Security
Check for:
- Raw queries
- Unsafe dynamic SQL
- ORM misuse
- Missing transaction boundaries
- Data leakage risks
- Missing row-level protections

## 6. Secrets & Sensitive Data
Check for:
- Hardcoded secrets
- API keys
- Tokens
- Credentials
- Debug endpoints
- Sensitive logging
- PII exposure

## 7. Cloud / Infrastructure / DevOps
Check for:
- Unsafe environment handling
- Weak Docker configs
- Insecure CI/CD patterns
- Misconfigured CORS
- Open ports
- Unsafe YAML configs
- Overprivileged service accounts

## 8. Dependency & Supply Chain Risks
Check for:
- Dangerous packages
- Deprecated libraries
- Known vulnerable dependencies
- Typosquatting indicators
- Unsafe package execution

## 9. Concurrency / Async Risks
Check for:
- Race conditions
- Async blocking calls
- Deadlocks
- Shared mutable state
- Unsafe background tasks

## 10. Business Logic Vulnerabilities
Think deeply about:
- Payment bypass
- Replay attacks
- Multi-step workflow abuse
- Abuse of discounts/credits
- State manipulation
- Trusting client-side state
- Logic bypasses

--------------------------------------------------
THREAT MODELING
--------------------------------------------------

Identify:
- Entry points
- Trust boundaries
- Sensitive assets
- Attack surfaces
- High-value targets
- Data flow risks

Explain:
- How an attacker would move through the system
- Which components are most critical
- Which vulnerabilities can chain together

--------------------------------------------------
PENTESTER POV
--------------------------------------------------

Include a dedicated section titled:

# Pentester POV

In this section:
- Think like a real attacker
- Prioritize highest ROI attack paths
- List likely exploitable endpoints
- Describe realistic exploitation steps
- Mention post-exploitation opportunities
- Identify lateral movement possibilities
- Identify persistence opportunities

--------------------------------------------------
FALSE POSITIVE CONTROL
--------------------------------------------------

IMPORTANT:
- Do NOT invent vulnerabilities.
- Only report findings supported by evidence from the code.
- If uncertain, explicitly label the finding as:
  "Potential Issue – Requires Verification"

For every finding provide:
- Severity: Critical / High / Medium / Low / Info
- Confidence: High / Medium / Low
- CWE classification if applicable
- OWASP category if applicable
- Impact
- Exploit scenario
- Exact vulnerable code reference
- Recommended fix
- Safer code example if possible

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------

Generate a professional Markdown report with:

# Executive Summary
# Architecture Risk Overview
# Attack Surface Mapping
# Detailed Findings
# Pentester POV
# High-Risk Attack Chains
# Recommended Remediation Roadmap
# Security Maturity Assessment
# Final Risk Score

Use tables where appropriate.
"""

# Safe threshold below the 250k TPM limit to account for response tokens
MAX_TOKENS_PER_CHUNK = 180000 
COOLDOWN_SECONDS = 65 # Sleep just over a minute to reset the TPM quota

def get_files_to_process(root_dir="."):
    """Yields valid file paths."""
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for file in filenames:
            ext = os.path.splitext(file)[1]
            if ext in VALID_EXTENSIONS:
                yield os.path.join(dirpath, file)

def chunk_codebase(client: genai.Client, model_name: str, root_dir=".") -> list[str]:
    """Reads files and groups them into chunks that respect the token limit."""
    chunks = []
    current_chunk = ""
    
    for filepath in get_files_to_process(root_dir):
        try:
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                file_string = f"\n\n--- File: {filepath} ---\n\n{content}"
                
                # Check how many tokens the current chunk + new file would be
                test_string = current_chunk + file_string
                token_response = client.models.count_tokens(
                    model=model_name,
                    contents=test_string
                )
                
                if token_response.total_tokens > MAX_TOKENS_PER_CHUNK:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = file_string # Start new chunk with the current file
                else:
                    current_chunk = test_string
        except Exception as e:
            print(f"⚠️ Skipping {filepath}: {e}")
            
    if current_chunk:
        chunks.append(current_chunk)
        
    print(f"📦 Codebase split into {len(chunks)} chunk(s).")
    return chunks

def process_chunk(client: genai.Client, model_name: str, chunk_text: str) -> str:
    """Processes a single chunk with retry logic."""
    user_message = f"Codebase Context:\n```\n{chunk_text}\n```"
    backoff = 5

    while True:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[SYSTEM_PROMPT, user_message],
                config=types.GenerateContentConfig(temperature=0.2),
            )
            return response.text

        except (errors.ServerError, errors.ClientError) as exc:
            err_str = str(exc)
            if any(code in err_str for code in ("429", "503")):
                print(f"⚠️ Rate-limited (429/503). Waiting {backoff}s...")
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
                continue
            print(f"❌ API Error: {exc}")
            return f"Error processing chunk: {exc}"

def run_analysis():
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # Determine which model is available by doing a lightweight check
    active_model = None
    for model_name in MODELS_TO_TRY:
        try:
            # Simple ping to verify access
            client.models.generate_content(model=model_name, contents="ping")
            active_model = model_name
            print(f"✅ Using model: {active_model}")
            break
        except Exception:
            continue
            
    if not active_model:
        print("🚨 All models exhausted or unavailable.")
        sys.exit(1)

    print("Gathering and chunking codebase...")
    chunks = chunk_codebase(client, active_model)
    
    full_report = []
    
    for i, chunk in enumerate(chunks):
        print(f"⏳ Processing chunk {i + 1} of {len(chunks)}...")
        result = process_chunk(client, active_model, chunk)
        full_report.append(result)
        
        # If there are more chunks, wait for the TPM quota to reset
        if i < len(chunks) - 1:
            print(f"⏸️ Waiting {COOLDOWN_SECONDS} seconds for TPM quota reset...")
            time.sleep(COOLDOWN_SECONDS)
            
    # Combine outputs
    final_output = "\n\n".join(full_report)
    final_output += f"\n\n---\n*Processed by `{active_model}`*"
    
    with open("analysis_report.md", "w", encoding='utf-8') as f:
        f.write(final_output)
        
    print("🎯 Processing complete. Report generated.")

if __name__ == "__main__":
    if not GEMINI_API_KEY:
        print("❌ Missing required environment variable: GEMINI_API_KEY")
        sys.exit(1)

    run_analysis()
