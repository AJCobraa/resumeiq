# ResumeIQ Infrastructure Plan: Single-Node Relational Architecture

## 1. Architecture Verdict: The Single PostgreSQL Database

**The Move to a Single Relational DB**
We are transitioning away from the hybrid Firestore/PostgreSQL model to a **pure, single-node PostgreSQL architecture**.
This eliminates the complexity of dual-writes, network failures between databases, and lack of atomic guarantees across systems.

### Why Postgres?
- **JSONB for Unstructured Data:** Postgres handles deeply nested JSON perfectly via `jsonb`. Resumes, Job Descriptions, and nested objects can be stored without strict columnar rigidity, identical to Firestore documents.
- **pgvector for AI Embeddings:** Postgres natively stores and queries 3072-dimensional float arrays (from `gemini-embedding-001`) via the `pgvector` extension.
- **ACID Transactions for Ledger/Billing:** Financial transactions (coin balances, spend tracking) require atomic integrity, which Postgres natively provides.
- **Aggregation:** Postgres can easily sum daily coin usage, compute token costs, and provide cross-user analytics—operations that were impossible in Firestore without reading every single document.

---

## 2. The Golden Rule: "Zero Loss" Formula & Token Mechanics

The system ensures that a user's total loaded cost never exceeds 75% of their subscription. We achieve this via **Method C: Loaded Token Approach with Upfront Deduction**.

### The Overhead Multiplier
We apply a **2.0 multiplier (100% markup)** to the base cost of AI tokens. This overhead covers retries, prompt wrapping, hosting, and guarantees a 35% gross margin.

**Mathematical Formula:**
```
loaded_cost_usd = (input_tokens × input_rate × 2.0) + (output_tokens × output_rate × 2.0)
```
*(1 coin = $0.0001 USD. Users only ever see coins, never USD)*

### Fixed Cost Deduction (Pre-Flight)
To ensure absolute safety, coins are deducted **upfront** before the AI call. There are no refunds for failed calls.

**Constants (`backend/core/constants.py`):**
- `parse_resume_pdf`: 35 coins
- `analyze_and_recommend`: 30 coins
- `generate_interview_prep`: 12 coins
- `rewrite_bullet`: 3 coins
- `embed_resume`: 6 coins
- `embed_jd_sentences`: 3 coins

*(Total Workflow = 89 coins)*

---

## 3. System Data Flow: The Budget Guard

To prevent double-spending, all AI requests pass through the Budget Guard.

### Step 1: Pre-Flight Lock & Deduct (Atomic)
When an endpoint is hit (e.g., `/analyze`):
1. A transaction opens in Postgres.
2. `SELECT coins_balance FROM user_credits WHERE user_id = $1 FOR UPDATE`
   - *This strict row-level lock ensures rapid double-clicks wait in a queue rather than reading stale balances.*
3. If `coins_balance < FIXED_COST`: Rollback and return HTTP 402 ("Not enough coins").
4. If sufficient: `UPDATE user_credits SET coins_balance = coins_balance - FIXED_COST`.
5. The lock is immediately released.

### Step 2: AI Execution (Vertex AI / AI Studio)
The backend executes the AI call via Google GenAI.
- `APP_ENV=dev`: Routes to Google AI Studio (free).
- `APP_ENV=prod`: Routes to Vertex AI (paid).

### Step 3: Post-Flight Telemetry
Regardless of AI success or failure, we asynchronously log the event for internal analytics.
- Insert into `coin_transactions`: Includes `user_id`, `operation`, `coins_charged`, `input_tokens`, `output_tokens`, and the calculated `actual_cost_usd`.

---

## 4. Payment Gateway Strategy

**Razorpay** will be the exclusive payment gateway at launch.
- **Why:** The primary market is India-first. Razorpay natively supports UPI, domestic cards, and easy Indian KYC.
- **Micro-Transactions:** Razorpay's ~2% flat fee is sustainable for $2.00 (5,000 coin) top-ups, whereas Stripe's fixed per-transaction fee (2.9% + $0.30) destroys margin on small purchases.
- **Subscriptions:** Handles recurring mandates (eSubscriptions) for the Starter ($5), Pro ($15), and Growth ($30) tiers.

---

## 5. PostgreSQL Schema Definition

**`users`**
- `uid` (PK, String) - Matches Firebase Auth UID
- `email` (String)
- `plan_type` (Enum: free, starter, pro, growth)
- `razorpay_customer_id` (String, nullable)
- `created_at` (Timestamp)

**`user_credits`**
- `user_id` (PK, FK -> users.uid)
- `coins_balance` (Integer)
- `billing_cycle_end` (Timestamp)

**`coin_transactions`** (Append-only Ledger)
- `id` (PK, UUID)
- `user_id` (FK -> users.uid)
- `operation` (String)
- `coins_charged` (Integer)
- `input_tokens` (Integer)
- `output_tokens` (Integer)
- `actual_cost_usd` (Numeric)
- `created_at` (Timestamp)

**`resumes`**
- `resume_id` (PK, UUID)
- `user_id` (FK -> users.uid)
- `resume_data` (JSONB) - The structured resume
- `created_at` (Timestamp)

**`resume_embeddings`**
- `id` (PK, UUID)
- `resume_id` (FK -> resumes.resume_id)
- `chunk_id` (String)
- `embedding` (vector(3072))

*(Note: Similar structure for `jobs` and `jd_embeddings`)*
