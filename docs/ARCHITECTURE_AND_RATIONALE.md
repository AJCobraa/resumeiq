# ResumeIQ — Architecture & Rationale

> **Living Document** — Updated as the application evolves.
> This document explains the "why" behind every technical decision.

---

## 1. System Overview

ResumeIQ is a 3-part SaaS application:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Chrome Ext     │────▶│   FastAPI Backend │────▶│   PostgreSQL     │
│  (Manifest V3)   │     │   (Python 3.11)   │     │  (pgvector:pg16) │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │                        │
┌──────────────────┐              │              ┌─────────┴────────┐
│   React Web App  │──────────────┘              │   Firebase Auth  │
│  (Vite + TW)     │                             │   (JWT only)     │
└──────────────────┘                             └──────────────────┘
```

#### Job Persistence & Resume Association
Jobs are linked to the resume used for their analysis. If a resume is deleted, the job analysis history is preserved but enters a "Resume deleted" state. 
- **Snapshotting**: The `resumeTitle` is snapshotted into the Job document at analysis time to ensure the UI can display which resume was used even if the original is gone.
- **Re-analysis**: When a job's source resume is missing, the user is prompted to select an active resume before re-analyzing.
- **Approvals**: Bullet point approvals are disabled for jobs with deleted resumes to prevent database inconsistency.

## Data Flow (A-Z)
1. User signs in via Google (Firebase Auth) on the web app
2. Frontend receives an ID token from Firebase
3. Every API call includes this token in the `Authorization` header
4. Backend verifies the token via Firebase Admin SDK
5. User creates/edits resumes through the web app
6. Resume data is stored in PostgreSQL `resumes` table as JSONB
7. On resume save, embeddings are computed via `gemini-embedding-001` and cached in `resume_embeddings` table
8. Chrome Extension detects job descriptions on LinkedIn/Naukri/Indeed/Internshala
9. Extension triggers the analysis pipeline via `POST /api/analyze`
10. Budget Guard deducts coins atomically before any AI call
11. Pipeline uses cached resume embeddings + fresh JD embeddings for semantic matching
12. Gemma 4 rewrites resume bullets to address missing keywords
13. Results saved to `jobs` table as JSONB, audit logged to `coin_transactions`
14. /api/jobs/{jobId}/interview-prep analyzes resume gaps vs JD requirements
15. Model predicts likely interview questions and coached answers based on company tier
16. Results are displayed in the dashboard's Interview Prep panel

---

## 2. Technology Choices

### Why PostgreSQL (Single-Node Relational DB)?
- **ACID transactions**: Atomic credit deduction + data writes in one transaction
- **Row-level locking**: `SELECT ... FOR UPDATE` prevents double-spending
- **JSONB columns**: Preserves document flexibility while adding relational integrity
- **pgvector extension**: Native 3072-dim vector storage and similarity search
- **SQL aggregation**: Live stats queries (no pre-aggregation needed)
- **Single source of truth**: Eliminates dual-write complexity
- **Firebase Auth retained**: Google Sign-In + JWT verification only (no Firestore)

### Why Gemma 4 (`gemma-4-31b-it`)?
- Free via Google AI Studio API
- Strong instruction-following for structured JSON output
- Good enough for resume rewriting tasks
- Same API as other Google models — easy to swap later

### Why `gemini-embedding-001`?
- Supported text embedding model for the `google-genai` SDK
- Completely free via AI Studio
- 3072-dimensional vectors — excellent semantic matching quality
- Same `google-genai` SDK as Gemma — single dependency

### Why Puppeteer (not html2canvas)?
- Puppeteer generates **text-based PDFs** — ATS systems can parse them
- html2canvas generates **image PDFs** — ATS systems cannot read them
- This is a critical ATS requirement, not a preference

---

## 3. Database Design

### UUID Strategy
- All IDs are UUID v4, generated server-side at creation time
- Never regenerated, never client-provided for new documents
- This ensures consistency across distributed operations

### Why JSONB Blobs (not Normalized Tables)?
- Resume sections (experience, skills, etc.) are always loaded together
- Normalizing into 6+ relational tables would require complex joins per resume load
- JSONB preserves the frontend's expected document shape
- PostgreSQL JSONB operators allow efficient querying when needed
- Trade-off: less strict schema enforcement at the DB level (compensated by Pydantic models)

### Embedding Storage (pgvector)
- Resume embeddings: `resume_embeddings` table with `Vector(3072)` column
- JD embeddings: `jd_embeddings` table with `Vector(3072)` column
- Eliminates the need for external vector databases (Pinecone, Weaviate)
- pgvector supports cosine similarity searches natively

---

## 4. API Endpoints

| Method | Path | Purpose | Phase |
|--------|------|---------|-------|
| GET | `/api/health` | Health check for Docker/K8s | 1 |
| GET | `/api/me` | Get/create user profile | 1 |
| GET | `/api/resumes` | List resumes (summary) | 2 |
| GET | `/api/resumes/{id}` | Full resume | 2 |
| POST | `/api/resumes` | Create blank resume | 2 |
| PATCH | `/api/resumes/{id}/meta` | Update meta fields | 2 |
| PATCH | `/api/resumes/{id}/sections` | Replace full sections array | 2 |
| PATCH | `/api/resumes/{id}/bullet` | Update single bullet | 2 |
| PATCH | `/api/resumes/{id}/template` | Update template | 2 |
| PATCH | `/api/resumes/{id}/title` | Update resume title | 2 |
| DELETE | `/api/resumes/{id}` | Delete resume + jobs | 2 |
| POST | `/api/resumes/{id}/export-pdf` | PDF export via Puppeteer | 2 |
| POST | `/api/resumes/import-pdf` | PDF import (stub) | 2 |
| POST | `/api/analyze` | AI analysis pipeline | 4 |
| GET | `/api/jobs` | List jobs (summary) | 5 |
| GET | `/api/jobs/{id}` | Full job with recs | 5 |
| PATCH | `/api/jobs/{id}/status` | Update status | 5 |
| PATCH | `/api/jobs/{id}/recommendation` | Approve/edit/dismiss | 5 |
| POST | `/api/jobs/{id}/interview-prep` | Generate/retrieve AI interview prep | 6 |
| DELETE | `/api/jobs/{id}` | Delete job | 5 |

---

## 5. Frontend Architecture

*For detailed component maps and library info, see:* [FRONTEND_README.md](file:///c:/Users/1403/Applications/Projects/resumeiq/docs/FRONTEND_README.md)

### State Management
- **AuthContext**: Firebase auth state + user profile
- **ResumeContext**: Current resume being edited
- **No Redux**: React Context is sufficient for this scale

### Routing
- `/` — Landing page (public)
- `/dashboard` — Job applications dashboard
- `/resumes` — Resume list
- `/resumes/:id` — Resume editor
- `/settings` — Account settings

### Design System
- **Public landing (`Landing.jsx`):** Light marketing shell using CSS variables in `src/index.css` (`--background`, `--primary`, `--brand`, `shadow-soft` / `shadow-glow`) plus `tailwind.config.js` extensions (`bg-card`, `text-muted-foreground`, etc.). Sticky nav uses backdrop blur; layout is full width (no `#root` max-width).
- **Authenticated app (dashboard, editor, modals):** Still uses legacy Tailwind tokens from the same `index.css` `@theme` block (`bg-bg-primary`, `text-accent-blue`, `border-border-default`, …) so existing screens keep their dark panels and accents without a sweeping component rewrite.
- Font UI: DM Sans, Font Mono: JetBrains Mono (loaded in `index.html`).
- Tailwind v4 loads the JS theme via `@config '../tailwind.config.js'` in `index.css`; `tailwindcss-animate` supplies shadcn-style animation utilities used by the extended theme.

---

## 6. File Glossary

*Updated as files are created.*

### Root
| File | Purpose |
|------|---------|
| `AGENTS.md` | Persistent agent rules |
| `docs/FRONTEND_README.md` | Detailed frontend spec & library info |
| `firebase.json` | Firebase CLI config |
| `firestore.rules` | Security rules |
| `firestore.indexes.json` | Composite indexes |
| `.gitignore` | Git exclusions |

### Backend (`/backend`)
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app entry point |
| `firebase_admin_init.py` | Firebase Admin SDK + token verification |
| `requirements.txt` | Python dependencies |
| `routers/auth.py` | Auth routes |
| `routers/resumes.py` | Resume CRUD routes (9 endpoints) |
| `routers/jobs.py` | Job dashboard routes |
| `routers/analysis.py` | AI analysis route |
| `models/resume_model.py` | Resume Pydantic models |
| `models/job_model.py` | Job Pydantic models |
| `services/resume_service.py` | PostgreSQL CRUD for resumes (JSONB) |
| `services/pdf_service.py` | Puppeteer-based PDF rendering |
| `services/embedding_service.py` | Caching & Text Embeddings (`google-genai`) |
| `services/gemma_service.py` | Deep AI scoring and re-writing |
| `services/analysis_pipeline.py` | 3-Layer analysis orchestration |
| `scripts/pdf_render.js` | Headless Chrome renderer |

### Frontend (`/frontend`)
| File | Purpose |
|------|---------|
| `tailwind.config.js` | Tailwind theme extensions (semantic colors, shadows, keyframes) + `tailwindcss-animate` |
| `src/App.jsx` | Root component with routing |
| `src/main.jsx` | DOM entry point |
| `src/App.css` | Intentionally empty placeholder; layout is Tailwind-only (avoids legacy `#root` centering) |
| `src/index.css` | Tailwind v4 entry (`@import` + `@config`), landing HSL tokens, legacy `@theme` for in-app screens |
| `src/lib/firebase.js` | Firebase SDK init (auth only) |
| `src/lib/api.js` | Central API client (12 resume endpoints) |
| `src/lib/utils.js` | Utility functions (debounce, formatDate, etc.) |
| `src/lib/logger.js` | Production-safe logger |
| `src/context/AuthContext.jsx` | Auth state provider |
| `src/context/ResumeContext.jsx` | Resume state provider |
| `src/components/ui/*` | Button, Card, Badge, Spinner, Modal, Toast |
| `src/components/layout/*` | Sidebar, AppLayout (inline style margin) |
| `src/components/editor/MetaEditor.jsx` | Personal info form fields |
| `src/components/editor/SectionEditor.jsx` | All section type editors (exp/edu/skills/projects) |
| `src/components/templates/CobraTemplate.jsx` | ATS-safe resume template (Arial, inline styles) |
| `src/pages/Landing.jsx` | Public marketing landing (hero, bento feature cards, Framer Motion demos; Google sign-in preserved) |
| `src/pages/Dashboard.jsx` | Job dashboard with detailed analysis and prep |
| `src/components/dashboard/InterviewPrepPanel.jsx` | Interview question & coached answer predictor |
| `src/pages/MyResumes.jsx` | Resume list with CRUD modals |
| `src/pages/ResumeEditor.jsx` | Two-panel editor with live preview |
| `src/pages/Settings.jsx` | Account settings |

### Extension (`/extension`)
| File | Purpose |
|------|---------|
| `manifest.json` | MV3 configuration |
| `content.js` | Job extraction + sidebar injection for 4 portals |
| `background.js` | Service worker — token persistence + `OPEN_DASHBOARD` handler |
| `popup.html/.js/.css` | 5-state popup with "Sidebar Active" badge |
| `auth-sync.js` | Connects React local storage to extension |
| `keyword-engine.js` | Client-side keyword extraction + resume matching (no backend) |
| `sidebar.js` | Self-invoking sidebar panel — 6-state controller |
| `sidebar.css` | Sidebar styles scoped under `#resumeiq-sidebar` |

---

## Section 18 — JD Caching & Relational Vector Storage

### 18.1 JD Embedding Cache Migration

**Problem:** Initially, JD embeddings were cached in the `jobs.job_data` JSONB blob using a content hash (`jdHash`) as the cache key. This caused significant data bloat (vectors are large) and made it impossible to perform vector similarity searches across job descriptions without loading every job document into memory.

**Current Decision (Relational Migration):** Migrate JD embeddings to a dedicated `jd_embeddings` table using `pgvector`.

**Implementation:**
- **Table Schema:** `jd_embeddings` stores `id` (UUID), `job_id` (String FK), `sentence_idx` (Integer), and `embedding` (Vector 3072).
- **Optimization:** `analysis_pipeline.py` now resolves the job identity early and checks the `jd_embeddings` table before calling the embedding service.
- **Background Persistence:** On a cache miss, fresh embeddings are computed and a fire-and-forget background task (`update_jd_embeddings_cache`) handles the bulk insertion into PostgreSQL.
- **Data Cleanup:** The legacy `jdEmbeddingsCache` field is stripped from the `job_data` JSONB payload during the update, reducing document size by ~95%.
- **Cascading purges:** Using `cascade="all, delete-orphan"` in the SQLAlchemy relationship ensures that deleting a job record automatically cleans up its associated vector embeddings.

**Why this works:** It provides a cleaner separation of concerns, enables future vector-based job recommendations (finding jobs similar to a target JD), and maintains a lean `jobs` table for fast dashboard queries.

### 18.2 Model Usage Monitoring (Legacy)
**Note:** This section was moved to Personal Stats in Section 26.

---

## Section 19 — Critical Bug Fixes

### 19.1 PDF Import

**Problem:** `POST /api/resumes/import-pdf` was a 501 stub.

**Decision:** Full implementation using `pdfplumber` for text extraction and `parse_resume_from_text()` in Gemma for structured parsing.

**Implementation:**
- PDF written to `/tmp/` (ephemeral, container-safe) and cleaned up in `finally`
- `pdfplumber` extracts selectable text (ATS-safe PDFs only — warns if empty)
- Gemma prompts structured JSON extraction matching the ResumeIQ schema
- `resume_service.create_resume_from_parsed()` generates server-side UUIDs for all sections/bullets
- Background task triggers embedding cache after import
- Frontend file input hidden, triggered by button click (avoids native file dialog styling issues)

### 19.2 Recommendation Approval Sync Bug

**Root Cause:** `_apply_recommendation_to_resume` used **text matching** to find bullets (`bullet.text == currentText`). Once a first approval changed a bullet, subsequent approvals looking for that same original text silently failed.

**Fix (Backend — `analysis_pipeline.py`):** When building recommendations, `_find_bullet_ids()` scans the resume to find the `sectionId` and `bulletId` corresponding to `currentText`. These IDs are embedded into each recommendation object at generation time.

**Fix (Frontend — `Dashboard.jsx`):** After any `approve/dismiss/edit` action, the full job detail is **re-fetched from the backend** instead of optimistically updating local state. This ensures the UI always reflects persisted Firestore state, eliminating stale state divergence.

---

## Section 20 — Template, UI, and Export Fixes

### 20.1 Duplicate Section Headers in Template
**Problem:** `CobraTemplate.jsx` rendered a separate "EXPERIENCE" header for every job entry.
**Decision:** Group entries by section `type`. Render one header per type, then map through the items.
**Implementation:** Grouped the `experience` array by checking standard mapping loops in `CobraTemplate` rather than scattering headers across objects.

### 20.2 PDF Export Formatting Overlaps
**Problem:** Long bullet points bled into page margins or other columns.
**Decision:** Restrict the widths of dynamically loaded lists using standard CSS metrics rather than relative sizing inside Puppeteer runs.
**Implementation:** `CobraTemplate.jsx` injected specific inline `w-full max-w-[some px]` controls, and `puppeteer` export script was updated to strictly enforce page `width`/`height` bounding boxes.

### 20.3 React State Re-Rendering Glitches
**Problem:** The right panel preview wasn't smoothly matching the left panel state due to complex debouncing clashing with layout calls.
**Decision:** Standardized the dependency array in `useEffect` and normalized internal wrapper boundaries to prevent reflow loops.

---

## Section 21 — Caching, Scoring, UI, and Skills Fixes

### 21.1 Robust JD Cache Keying
**Problem:** Scraping URL tracking params or extra whitespace defeated the `jdHash` MD5 matching.
**Decision:** Aggressively normalize text and URLs before cache checks.
**Implementation:**
- Strip tracking params using `urllib.parse` inside both `/api/jobs/check` and `analysis_pipeline.py`.
- Strip line breaks and sequential whitespaces using `re.sub(r'\s+', ' ', jd_text).strip()` prior to hashing `jdHash`.

### 21.2 Semantic Score Thresholding
**Problem:** Semantic Score was 0% because irrelevant content (like personal info or short bullets) diluted the average chunk similarity calculation.
**Decision:** Only calculate averages against highly relevant matched chunks.
**Implementation:** Added a threshold filter `[score for score in raw_scores if score >= 0.5]` when mapping resume chunks against JD embeddings to create an accurate 'best matched features' percentage.

### 21.3 Dynamic Extension Editing
**Problem:** Job boards structure titles natively, but the extension failed gracefully and left them uneditable as "Unknown Position."
**Decision:** Expose extracted properties via editable inputs right in the extension popup before it hits the backend.
**Implementation:** Converted `<p>` nodes to `<input>` fields in `popup.html` and bound `UI.jobTitle.value` dynamically in `popup.js`.

### 21.4 Skill Array Mutation for Recommendations
**Problem:** Approving a skill recommendation broke because skills are stored as nested text inside `[{categoryId, items: [string]}]` rather than isolated `bulletId` objects.
**Decision:** Trap any `type == "skills"` arrays in the updater pipeline and manipulate the values using index-based tracking.
**Implementation:** `_apply_recommendation_to_resume` iterates into the list, grabs `index(current_text)` natively, and injects `new_text` in Python specifically when traversing a matched `categoryId`.

---

## Section 22 — URL Normalization and Upsert Strategy
**Problem:** Standard "Insert Always" caching meant analyzing identical jobs on LinkedIn (which append dynamic tracking `?refId=...` parameters) continually created new duplicate Jobs in Firestore, wasting space and blowing up UI tracking.
**Decision:** Adopt a strict "Upsert by Cleaned URL" model to ensure job instances remain completely singular per user per application point.
**Implementation:**
- URLs strictly undergo `urllib.parse` unparsing to trim queries.
- `POST /api/analyze` stops inserting `uuid.uuid4()` blindly. It runs a global URL search loop `_check_jd_cache(user_id, jd_url_clean)`.
- If an identity matches, it recycles the `jobId` and `createdAt` dates.
- We run `.set(job_doc)` against the matching ID natively within Firestore to inherently **OVERWRITE/UPSERT** analysis metrics, bypassing DB bloat entirely.
- Added explicit `[CACHE]` logs in the FastAPI worker to enforce absolute visibility over routing hit rates.

---

## Section 23 — In-App Re-Analyze UX Loop
**Problem:** Users would approve multiple granular AI fixes inside the Job Detail Drawer, but the overall ATS score and Semantic Score wouldn't adapt live without backing completely out of the app, finding the extension again, and re-invoking the external content-script payload.
**Decision:** Construct a high-speed internal refresh circuit explicitly bypassing URL validation limits.
**Implementation:**
- Expose the exact tracking identifier via standard API requests: `jobId` passed natively inside the HTTP POST body.
- When `jobId` is parsed, the backend entirely skips hash mapping and URL lookup, reading the `job_id` document string natively off disk.
- Automatically refreshes the UI Modal with the new return payload containing shrunken recommendation arrays and the freshly computed ATS metrics.

---

## Section 24 — Analysis Cache + Semantic Reliability Fix
**Problem:** Three issues were linked: (1) repeated analysis of the same JD sometimes missed cache, (2) semantic score showed `0%` too often, and (3) same JD could create duplicate job docs.

**Root Cause:** JD embedding creation and JD cache write were implicitly coupled to resume embedding availability. If resume embeddings were missing/stale (common right after edits), semantic computation short-circuited and JD cache was never persisted. Later runs then had no JD cache to reuse and could create new rows.

**Decision:** Decouple JD cache generation from semantic scoring, and make job identity resolution deterministic (`jobId` > `jdHash` > cleaned `jdUrl`).

**Implementation (`backend/services/analysis_pipeline.py`):**
- Normalize JD content before hashing (`re.sub(r"\s+", " ", jd_text).strip()`), then hash normalized text for stable `jdHash`.
- Normalize URL before lookup (strip tracking query params) and use it only as fallback identity.
- Resolve existing jobs in this order: explicit `jobId` (re-analyze), then `jdHash`, then cleaned `jdUrl`.
- Compute JD embedding whenever cache is absent (even if resume chunks are empty), so `jdEmbeddingsCache` always gets written for future runs.
- If resume cache chunks are missing, compute embeddings on-demand for this analysis instead of returning semantic `0` by default.
- Upsert using resolved job id to overwrite existing records instead of blindly creating a new UUID.
- Adds a `debug` object in analysis responses for runtime verification without DB inspection:
  - `cacheLookupSource` (`jobId` | `jdHash` | `jdUrl` | `none`)
  - `resolvedJobId`
  - `matchedExistingJob`
  - `hasJdEmbeddingsCache`
  - `jdEmbeddingComputed`
  - `resumeEmbeddingsComputedOnDemand`
- Frontend `Dashboard` job detail modal renders these diagnostics only in dev mode (`import.meta.env.DEV`) so production users do not see internal pipeline metadata.

**Why this works:** Cache write is now guaranteed independent of resume cache timing, semantic scoring has a fallback path, and duplicate prevention uses stable identifiers instead of best-effort URL matching only.

### 24.1 Extension Error Transparency
**Problem:** The extension popup always showed "backend not running" for any `/api/analyze` failure, masking real causes (validation errors, extraction issues, auth failures, model errors).

**Decision:** Surface backend error details directly in the popup and block obviously invalid analyze requests early.

**Implementation (`extension/popup.js`):**
- Validate extracted JD text before API call (minimum non-empty length threshold).
- Parse error responses from `/api/analyze` as JSON and display `detail` when present.
- Fallback to raw response text / HTTP status if JSON detail is unavailable.
- Keep the generic state flow but display a precise error message to the user.

### 24.2 LinkedIn Extraction Hardening
**Problem:** LinkedIn UI variations caused title extraction to fall back to `Unknown Position`, URL capture to store generic search links, and JD extraction to include noisy container/page text. This degraded recommendation quality and cache identity.

**Decision:** Harden LinkedIn extraction around canonical job identity and strict JD quality checks.

**Implementation (`extension/content.js`):**
- Added robust selector sets for job title/company across old and new LinkedIn job layouts.
- Infer canonical JD URL as `https://www.linkedin.com/jobs/view/{jobId}/` whenever a job id can be found from active list items or job links.
- Stop falling back to entire page/container text for JD extraction on LinkedIn.
- Enforce minimum JD content quality (length threshold); if too short, return empty JD so popup shows extraction failure instead of sending noisy prompt context to the model.
- Adjusted extension message success criteria: if LinkedIn job context exists (title/company/url) but JD is still loading, popup enters "job detected" state and defers strict JD validation to Analyze click.

### 24.3 LinkedIn Compatibility Rollback-Hybrid
**Problem:** Strict JD-length gating caused false negatives on valid LinkedIn jobs where the right pane content was partially loaded, leading to "No Job Found" / "not enough text" despite visible job details.

**Decision:** Keep improved URL/title resilience, but restore permissive fallback extraction behavior from the original implementation.

**Implementation:**
- Reintroduced right-panel/body-text fallback for LinkedIn JD extraction.
- Removed hard minimum-length gating from extraction phase.
- Popup now blocks only when JD text is actually empty.
- Retained canonical `jobs/view/{id}` URL inference and improved error detail messaging.

### 24.4 Extension JD Review/Edit Control
**Problem:** Users had no way to verify or correct extracted JD text before analysis, which made debugging extractor issues difficult and could hurt recommendation quality.

**Decision:** Add an explicit JD review/edit input in the extension popup so users can inspect extraction output and fix it before model calls.

**Implementation:**
- `extension/popup.html`: added a `textarea` (`#jd-text`) under resume selection.
- `extension/popup.js`: auto-populates `#jd-text` from extracted `jobDetails.jdText`, updates a live character counter, and sends textarea content as `jdText` in `/api/analyze`.
- `extension/popup.css`: added styles for textarea and metadata counter.

### 24.5 LinkedIn JD De-noising
**Problem:** LinkedIn extraction could include search rail/feed text (multiple jobs, promoted results, footer UI copy), which diluted model prompts and produced irrelevant recommendations.

**Decision:** Add a text-cleaning pass before sending JD to backend.

**Implementation (`extension/content.js`):**
- Strip common LinkedIn UI/marketing boilerplate tails (Premium prompts, footer/legal/help blocks, alerts widgets).
- Prefer slicing from JD anchors (`About the job`, `Key Responsibilities`, `Requirements`, `Tech Stack`) when present.
- If feed text appears before the selected job title, trim to the selected title occurrence.
- Final normalized cleaned text is used as `jdText`.

### 24.6 One-Click JD Cleanup in Popup
**Problem:** Even with extractor fixes, users need a manual fallback to sanitize JD text before analyzing when LinkedIn ships DOM changes.

**Decision:** Add an explicit "Auto-clean JD" action in popup.

**Implementation:**
- `extension/popup.html`: Added `#btn-clean-jd` beside JD textarea.
- `extension/popup.js`: Added `autoCleanJdText()` to strip LinkedIn boilerplate and trim around JD anchors/title; button applies cleaning in-place.
- `extension/popup.css`: Added compact action button styling (`.jd-actions`, `.btn-small`).

**Why this works:** Recommendation quality depends heavily on clean JD context. Failing fast on low-quality extraction is safer than generating poor rewrites from polluted text, and canonical job URLs keep cache matching stable.

---

## Section 25 — Interview Weakness Predictor & Company Tiering

**Problem:** Users need more than just a matching resume; they need to prepare for the specific interview bar set by different types of tech companies, especially for roles where they have skill gaps.

**Decision:** Implement a rule-based company classification system and a tier-aware interview prep generator.

**Implementation:**
- **Tier Classification (`gemma_service.py`):** Pure string matching against curated lists of FAANG, Big Tech, and Unicorns. 
  - `faang`: Google, Meta, Amazon, Microsoft, etc. (Expert depth, system design at scale).
  - `unicorn`: Stripe, Uber, Airbnb, Flipkart, etc. (Senior bar, delivery/impact focus).
  - `standard`: Mid-market tech / startups (Practical skills, learning ability).
- **Prep Generator (`gemma_service.py`):** Generates questions and "strategic coached answers" specifically addressing the top 3 missing keywords identified during analysis.
- **Backend Endpoint (`routers/jobs.py`):** `POST /api/jobs/{id}/interview-prep` handles generation and persistence.
- **Caching Mechanism:** Results are cached in the job document (`interviewPrep`) and tied to the `resumeId`. Changing the resume invalidates the prep cache.
- **Frontend UI (`InterviewPrepPanel.jsx`):** A dedicated panel in the job details modal that displays questions with difficulty badges and expandable coached answers.

**Why rule-based tiering?** FAANG and Unicorn bars are distinct and relatively stable. Using a local lookup instead of an LLM call for classification reduces latency and cost while maintaining high accuracy for known top-tier targets.

---

## Section 26 — Personal Usage & ROI Stats

**Problem:** Users wanted to see the value ResumeIQ brings (ROI) and monitor their own AI usage/telemetry without needing access to global admin dashboards. Additionally, the coin balance display was inconsistent, sometimes showing only subscription coins instead of the total balance.

**Decision:** Implement a comprehensive Personal Stats dashboard that aggregates usage data directly from PostgreSQL and calculates a "Total ROI" based on job search activity.

**Implementation:**
- **Backend (`routers/stats.py`):**
    - Aggregates `totalAiCalls`, `inputTokens`, and `outputTokens` directly from `coin_transactions` using SQL `func.sum()`.
    - Calculates `coins_balance` as the atomic sum of `subscription_coins` + `topup_coins`.
    - Implements a "Total ROI" metric calculated as `totalJobs * $2.00`. This provides a tangible value metric for the user based on the average market cost of manual resume tailoring ($2 per job).
- **Frontend (`PersonalStats.jsx`):**
    - Created a 6-card grid layout (using `xl:grid-cols-6` for responsiveness).
    - Visualizes AI performance using token-count badges and model usage strings.
    - Displays the "Total ROI" as a primary value metric with a currency symbol.
- **Data Integrity:** All stats are computed live from PostgreSQL tables (`coin_transactions`, `jobs`, `resumes`, `user_credits`), ensuring the stats page is always the source of truth for account state.

**Why live SQL aggregation?** Unlike the legacy Firestore pre-aggregation (Section 32), the PostgreSQL implementation handles aggregation efficiently on-the-fly for personal usage. This eliminates the risk of "dirty" counters and ensures the UI matches the actual transaction history perfectly.

## Section 27 — Dynamic Resume Template Selection

**Background:** Previously, all resumes were locked to the `cobra` template (SaaS default). As the product matures, users requested visual variety and specialized layouts (e.g., modern vs. corporate).

**Decision:** Implement a late-binding template architecture where the `templateId` is selected at creation/import time and persisted in the document.

**Implementation:**
- **Backend:** `resume_service.py` functions updated to accept `template_id`. `CreateResumeRequest` model updated with an optional `templateId` field.
- **Frontend Dashboard:** `MyResumes.jsx` now uses a 2-step wizard.
  - Step 1: Input Title (for New) or Select File (for Import).
  - Step 2: visual selection of template ('Cobra' or 'Executive Blue').
- **Editor Integration:** `ResumeEditor.jsx` dynamically imports and mounts the template component based on the `templateId` stored in the resume document.
- **Import Flow:** The `import-pdf` endpoint now explicitly accepts a `templateId` form field so the logic is applied immediately upon first population.

**Rationale for Client-Side Component Mapping:** Using a simple conditional map in `ResumeEditor.jsx` keeps the logic transparent and avoids complex higher-order component patterns while still being easily extensible as more templates are added.

---

## Section 28 — Late-Binding Template Registry & Auto-Discovery

**Problem:** Adding a new resume template required manual updates in three separate locations: (1) direct imports in `ResumeEditor.jsx`, (2) hardcoded modal cards in `MyResumes.jsx`, and (3) conditional rendering logic. This was brittle and discouraged template variety.

**Decision:** Implement a **Filename Auto-Discovery** pattern using Vite's `import.meta.glob`.

**Implementation:**
- **Metadata Export:** Every template component in `src/components/templates/` must now export a `templateMeta` object `{ id, name, description }`.
- **Dynamic Registry (`templateRegistry.js`):**
    - Uses `import.meta.glob` to eagerly load all `templateMeta` exports in the folder.
    - Uses `import.meta.glob` to lazily load the default component exports.
    - Automatically maps the template's preview image to `/resume-images/{FileName}.png`.
- **Consumption:**
    - `MyResumes.jsx` maps over `TEMPLATE_OPTIONS` to build the selection UI.
    - `ResumeEditor.jsx` uses `TEMPLATE_REGISTRY[resume.templateId].component` inside a `<Suspense>` boundary.

**Why Vite Glob Import?** It removes the need for a manually maintained mapping file while keeping the codebase clean. The transition to lazy loading (via `React.lazy`) also improves initial bundle size by only loading the template code when it is actually needed for rendering.

---

## Section 29 — Premium UI Overhaul & Tailwind v4 Transition

**Problem:** The initial landing page was a basic placeholder. To feel like a high-end SaaS, the product required a "wow" factor, premium aesthetics, and fluid interactivity.

**Decision:** Overhaul the public marketing shell using a "Zinc + Indigo" design system, a Bento Grid feature layout, and Framer Motion for high-fidelity animations. Simultaneously transitioned to Tailwind v4’s CSS-first architecture.

**Implementation:**
- **Tailwind v4 (CSS-First):** Moved theme definitions (colors, shadows, keepframes) from `tailwind.config.js` into the `src/index.css` `@theme` block. This ensures all custom variables are first-class CSS citizens and allows for cleaner integration with Vite.
- **Layout Normalization:** Wiped `App.css` to remove the default `1280px` centered `#root` constraint, allowing the landing page to use full-width sections and sticky headers correctly.
- **Bento Grid Layout:** Implemented a modern 3-column bento grid for features:
    - **Semantic Matching Card:** Loops between "Competitor" (keyword matching) and "ResumeIQ" (semantic match) states.
    - **Auto-Approve Card:** A multi-phase animation showing a bullet being suggested, approved, and instantly updated.
    - **Interview Predictor Card:** A complex interactive demo showing tier selection, a loading sequence, and a reveal of predicted questions/coached answers.
- **Animation Strategy:** Used `framer-motion` with generic "spring" and "gentleSpring" presets for all transitions to ensure consistent, physics-based movement rather than linear easing.

**Why this works:** The high-fidelity animations on the landing page serve as an immediate demonstration of value (showing *how* the AI works) rather than just telling the user. The move to a light, Zinc-based aesthetic feels cleaner and more modern for career-focused software.

---

## Section 30 — Premium Dashboard UI Overhaul

**Problem:** The initial dashboard and interview prep interfaces were functional but lacked a "premium" feel. Layout bugs (specifically in `#root`) constrained the grid and centered content unnecessarily.

**Decision:** Rewrite the Dashboard and Interview Prep components to use a refined "Zinc + Slate" aesthetic, fix the global layout centering, and standardize helper utilities.

**Implementation:**
- **Layout Fix:** `App.css` cleared to remove `#root` constraints, allowing for a standard top-left aligned application flow.
- **Design Tokens:** `index.css` updated with specific `--shadow-soft` and `--shadow-glow` variables to provide depth and visual interest.
- **Component Refresh:** 
    - `Dashboard.jsx`: Redesigned with a cleaner application grid, elevated stat cards, and a more structured job table.
    - `InterviewPrepPanel.jsx`: Updated with enhanced typography, better visual grouping for question cards, and clearer coached answer presentation.
- **Utility Standardization:** `utils.js` reset to a standardized version with consistent color mappings (`emerald`, `amber`, `rose`) for ATS scores and portal backgrounds.

**Why this works:** The new UI feels more like a modern SaaS application (comparable to Linear or Stripe) while maintaining full backward compatibility with the existing FastAPI backend and Firestore data model.

---

## Section 31 — Premium Job Detail Modal & Tabbed Coach

**Problem:** The single-pane Job Detail modal was becoming overwhelmed as we added keyword matches, semantic matching, AI recommendations, and interview prep. Information density was too high, leading to limited cognitive focus.

**Decision:** Architect a 3-tab navigation system within the modal and integrate circular SVG gauges for high-impact metric visualization.

**Implementation:**
- **Tabbed Layout (`Dashboard.jsx`):** Moved from a vertical scrolling list to a dedicated 3-view system:
  - **Score Details**: Focal point for keyword/semantic matches and debug diagnostics.
  - **AI Recommendations**: A dedicated interface for managing bullet-point improvements.
  - **Interview Coach**: Full integration of the `InterviewPrepPanel` question predictor.
- **SVG ScoreRings:** Replaced standard text percentages with animated circular gauges. Used custom SVG paths with `stroke-dasharray` for lightweight, pixel-precise progress visualization.
- **Improved Semantic Highlighting:** Semantic match details now use a tri-color conditional system (Emerald/Orange/Red) based on similarity thresholds (65%/40%).
- **Modal Constraints:** Fixed the Modal `size` to `lg`. This ensures a predictable viewport for the tabbed content and prevents horizontal overflow on ultra-wide displays.

**Why Tabs?** It compartmentalizes the user's workflow into three distinct stages: (1) Understanding the match, (2) Improving the resume, and (3) Preparing for the interview. This structure reduces noise and improves completion rates for AI recommendations.

---

## Section 32 — Firestore Read Optimization (Pre-Aggregation)

**Problem:** The Personal Stats performance was degrading over time. Every page load triggered a full scan of the `modelLogs` collection (to compute token usage and latency) and the `jobs` sub-collection (to compute ATS improvement and job counts). For a power user with 500+ logs, this represented hundreds of expensive reads per dashboard visit.

**Decision:** Shift from a "Scan for Stats" model to an "Update Summary on Write" model using atomic increments. 

**Implementation:**
- **Pre-Aggregated Summary:** Created `users/{uid}/stats/summary` document.
- **Model Logger Atomic Updates (`model_logger.py`):** The side-effect logger now performs a second write: it increments the global totals (`totalAiCalls`, `totalInputTokens`, etc.) and the nested `operations` map using `firestore.Increment`.
- **Job Counter (`analysis_pipeline.py`):** Increments `totalJobs` in the stats summary only when a truly new job document is generated (not on re-analysis).
- **Endpoint Simplification (`routers/stats.py`):** `GET /api/me/stats` now performs exactly **ONE** read (the summary doc) instead of $N$ log reads + $M$ job reads.
- `routers/jobs.py` implements strict `.limit(50)` on job list retrievals.
- **Frontend Simplification (`PersonalStats.jsx`):** Removed high-scan metrics (like "Average ATS Improvement") that were not suitable for atomic increment tracking without significant complexity.
- **Backfill Script (`backend/scripts/backfill_stats_summary.py`):** Provided a one-time migration tool to populate summaries for existing legacy data.

**Why this works:** Firestore billing is driven by read/write counts. By moving the "compute" burden to a single write at log-time (cheap), we eliminate thousands of repeated reads at view-time (expensive), leading to instant dashboard loading states and significantly lower cloud costs.

> [!IMPORTANT]
> **Technical Note: Firestore Dot-Notation Gotcha**
> In the Python Firebase Admin SDK, `summary_ref.set(data, merge=True)` treats keys containing dots (e.g., `"operations.score_ats.calls"`) as literal flat field names. This prevents proper nesting. To correctly update nested structures using dot-notation, `summary_ref.update(data)` must be used. Our `model_logger.py` implements a robust `update()` → `set()` fallback pattern to handle this SDK nuance safely for both new and existing users.

---

---

## Section 34 — Puppeteer v20+ Compatibility & Route Collisions

**Problem:** PDF export was failing silently with empty `detail: ""` errors. This was caused by Puppeteer v20+ writing Chrome-missing errors to `stdout` (swallowed by the previous `stderr`-only capture) and a FastAPI route collision where `{resume_id}` intercepted the `import-pdf` path.

**Decision:** Implement a robust error-capture layer and fix the route registration sequence.

**Implementation:**
- **Error Capture Layer (`pdf_service.py`):** Rewrote the subprocess handler to decode both `stdout` and `stderr` with UTF-8 replacement. The error message now uses `stderr_text or stdout_text`, ensuring that Puppeteer initialization failures are fully reported in the API response.
- **Route Order Correction (`resumes.py`):** Moved the `@router.post("/resumes/import-pdf")` handler above the dynamic `@router.post("/resumes/{resume_id}/export-pdf")` handler. This ensures FastAPI matches the static path before the wildcard.
- **Auto-Installation (`package.json`):** Added a `postinstall` script to `backend/scripts/package.json` to automatically download the correct Chrome binary on `npm install`, eliminating "Chrome not found" errors in new environments.
- **Graceful Exception Handling (`resumes.py`):** Expanded the `export_pdf` handler to include a catch-all `Exception` block, ensuring any internal failure (e.g., file system or network) returns a readable message instead of an empty payload.

**Why this works:** Route ordering is a foundational FastAPI behavior that was causing path shadowing. Combining this with full output capture ensures that any failure in the headless Chrome layer is immediately visible to both developers (via logs) and users (via clear UI error messages).

---

## Section 35 — Certifications, Achievements & Full Template Parity

### 35.1 New Section Types: Certifications & Achievements

**Problem:** The only editable section types were `experience`, `education`, `skills`, and `projects`. Users could not record certifications or standalone achievement bullet points — common for competitive job seekers.

**Decision:** Introduce `certifications` and `achievements` as first-class section types throughout the stack.

**Data Shape:**
- `certifications`: `{ sectionId, type: 'certifications', items: [{ certId(uuid), name, issuer, year, description }] }`
- `achievements`: `{ sectionId, type: 'achievements', bullets: [{ bulletId(uuid), text }] }`

**Why these shapes?** Certifications are structured records (name + issuer + year) while achievements are free-form bullet points — matching the `experience` bullets pattern for consistency.

### 35.2 SectionEditor — New Editors

**Files changed:** `frontend/src/components/editor/SectionEditor.jsx`

- Added `CertificationsEditor` — 2-column grid (Name, Issuer, Year, Description) with add/remove per item.
- Added `AchievementsEditor` — bullet-list textarea rows, identical UX pattern to `ExperienceEditor` bullets.
- Both editors registered in `renderSection` switch and `addSection` factory.
- Corresponding "🏅 Certifications" and "🏆 Achievements" buttons added to the **Add Section** toolbar.

### 35.3 Template Rendering — CobraTemplate & ExecutiveBlueTemplate

**Files changed:** `CobraTemplate.jsx`, `ExecutiveBlueTemplate.jsx`

Both templates now handle `certifications` and `achievements` inside their `groups.map()` switch using dedicated group-level components that follow the same `groupBy` pattern as existing types.

- `CertificationsGroup`: flatMaps `s.items`, renders name + issuer + year in a flex row.
- `AchievementsGroup`: flatMaps `s.bullets`, renders as `<BulletList>`.

**Why group-level?** Prevents duplicate section headers — all certifications across multiple `certifications`-typed sections are rendered under a single "Certifications" heading.

### 35.4 ExecutiveBlueTemplate — Photo Block Removal

Removed the avatar/initials placeholder (`meta.photoUrl ? <img> : <div with initials>`) from the header. Resume photos are not ATS-safe and create layout inconsistency across PDF exports. The `ContactRow` already renders all relevant identity information (email, phone, location, LinkedIn, GitHub).

### 35.5 ExecutiveBlueTemplate — GitHub Contact Link

Added `meta.github` rendering to `ContactRow` in `ExecutiveBlueTemplate`, matching the parity already present in `CobraTemplate`.

### 35.6 Backend — Skills Category Apply Strategy (jobs.py)

**Problem:** Approving a skills-rewrite recommendation failed silently. Skills are stored as `{ categoryId, items: [string] }` — not as `{ bulletId, text }` bullet objects. Strategy 1 (ID-based targeting) in `_apply_recommendation_to_resume` only searched `section.bullets` and `item.bullets`, missing the skills shape entirely.

**Fix:** Added **Strategy 1b** — before checking nested project items, if the matched section has `type == 'skills'`, iterate `section.categories` and match `cat.categoryId == bullet_id`. On match, replace `cat.items` with the comma-split `new_text` array.

**Why comma-split?** The AI rewrites a skills category as a comma-separated list (e.g., `"React, TypeScript, GraphQL"`). Splitting on `,` preserves the existing storage format without requiring a schema change.

### 35.7 PDF Service — Certifications & Achievements Rendering

**Files changed:** `backend/services/pdf_service.py`

Added `_render_certifications_group` and `_render_achievements_group` to the HTML builder. These are invoked inside the section-type switch in `_build_resume_html`, ensuring PDF exports are in full parity with the React template rendering.

---

## Section 36 — ResumeEditor Full UI Rebuild (Accordion Split-Pane)

### 36.1 Motivation

The previous `ResumeEditor.jsx` used a flat tab-based layout (`Personal Info | Sections | Template`) that rendered raw `MetaEditor` and `SectionEditor` components in a single scrolling column. This worked but was hard to navigate for long resumes. The new design introduces a premium accordion-based split-pane UI matching a design spec with entry-level collapsible cards per job/school/project.

### 36.2 Layout Override — Breaking Out of AppLayout

`AppLayout` wraps all pages with a sidebar (240 px `marginLeft`). The editor must be visually full-screen. The chosen approach adds `position: fixed; inset: 0; z-index: 50` to the root div of `ResumeEditor`. This places the editor above the sidebar without modifying `AppLayout`, `App.jsx`, or any routing config.

**Why not a separate route outside AppLayout?** Routing changes would also require adjusting the `useBlocker` ref context and the `navigate('/resumes')` paths. The fixed-overlay approach is zero-footprint on routing.

### 36.3 File Split

The rebuild is split into focused files to keep components under 200 lines:

| File | Contents |
|---|---|
| `src/lib/sectionUtils.js` | `moveSection()`, `genId()` — shared pure functions |
| `src/components/editor/AccordionSection.jsx` | `AccordionSection`, `EntryCard`, `FormField`, `AddEntryButton` |
| `src/components/editor/ExperienceAccordion.jsx` | Experience entry cards + bullet editing |
| `src/components/editor/EducationAccordion.jsx` | Education items (flattened from sections[].items) |
| `src/components/editor/ProjectsAccordion.jsx` | Projects entry cards + bullet editing |
| `src/components/editor/SkillsAccordion.jsx` | Flat category rows (no EntryCard nesting) |
| `src/components/editor/CertificationsAccordion.jsx` | Certifications items (flattened) |
| `src/components/editor/AchievementsAccordion.jsx` | Flat bullet list |
| `src/pages/ResumeEditor.jsx` | Main page — wires all above |

**Files deliberately kept unchanged:** `MetaEditor.jsx`, `SectionEditor.jsx`, `CobraTemplate.jsx`, `ExecutiveBlueTemplate.jsx`, `api.js`, `App.jsx`, all backend files.

### 36.4 Header Design

Three zones:
- **Left**: chevron back button + DocIcon + "ResumeIQ" wordmark + dimmed resume title.
- **Center**: pill tab switcher (`Content | Customize | AI Tools`) with filled-purple active state.
- **Right**: "Save Changes" button that activates (purple) only when `hasUnsavedChanges`, plus an orange dot indicator.

### 36.5 AccordionSection + EntryCard Pattern

`AccordionSection` is the outer group card (one per section type). `EntryCard` is an inner collapsible per entry (one per job, school, project, certification). The two-level nesting mirrors how resume data is structured: sections array (top level) → items/bullets (inner level).

### 36.6 Move Up/Down Logic

`moveSection()` in `sectionUtils.js` swaps `order` values between the target section and its nearest neighbor of the same type, then re-sorts the full array. This avoids index manipulation on a heterogeneous array and keeps order semantically encoded in each section object.

### 36.7 Data Model Compatibility

No data model changes. All accordion components read/write the same `resume.meta` (flat object) and `resume.sections` (typed array) fields used by the API and templates. The `handleMetaChange` and `handleSectionsChange` callbacks are identical to the previous implementation.

---

## Section 37 — Sidebar-First Extension Architecture

### 37.1 Motivation: The UX Gap

The original extension required a two-step user action: (1) click the toolbar icon to open the popup, then (2) click "Analyze Match" to trigger the backend AI pipeline (5–15 seconds). This meant **zero value was delivered until the user remembered to click twice**. The goal of this rebuild is to match and exceed Simplify's UX by delivering instant intelligence the moment a user lands on a job page.

**New flow:**
```
User lands on job page
  → sidebar auto-injects into DOM (<200ms)
  → instant keyword match shown (<500ms, entirely client-side)
  → user optionally clicks "Deep AI Analysis"
      → backend pipeline runs (5-15s)
      → full score + rewritten bullets appear in sidebar
```

### 37.2 New Files

| File | Purpose |
|---|---|
| `extension/keyword-engine.js` | Pure JS keyword extraction and resume matching — no backend, no latency |
| `extension/sidebar.js` | Self-invoking sidebar controller — builds DOM, coordinates all states |
| `extension/sidebar.css` | Sidebar stylesheet — scoped under `#resumeiq-sidebar` to prevent leakage |

### 37.3 Files Modified

| File | Change |
|---|---|
| `extension/content.js` | Added `injectSidebar()` and `autoInjectOnLoad()` IIFE |
| `extension/manifest.json` | Added `web_accessible_resources` for sidebar files |
| `extension/background.js` | Added `OPEN_DASHBOARD` message handler |
| `extension/popup.js` | Added "Sidebar Active" status badge check |

### 37.4 keyword-engine.js — Client-Side Matching

**Why client-side?** The deep AI pipeline (embedding + Gemma) is the power feature, but it's slow. A client-side token-frequency match can surface 80% of the signal in <100ms with zero API cost. The keyword engine:

- Strips stop words (curated 70-word list matching standard NLP practice)
- Normalizes tokens (lowercase, remove punctuation, collapse whitespace)
- Counts frequency and computes **TF-score** per term
- Extracts the same keyword set from the loaded resume (read from `localStorage` → `resumeiq_active_resume`)
- Computes a match percentage: `matched / total * 100`
- Returns matched, missing, and score values for immediate display

**Resume sourcing:** The engine reads the active resume from `localStorage` (written by the web app's `ResumeContext`). This avoids a background service-worker round-trip for the instant-match path. If no resume is loaded, the sidebar shows a prompt instead of an empty state.

### 37.5 sidebar.js — DOM Injection Strategy

**Why a self-invoking IIFE?** The sidebar is injected into third-party job pages (LinkedIn, Naukri, Indeed, Internshala). Using an IIFE means:
- No global scope pollution
- No dependency on ES module bundling in the content script context
- Idempotency guard (`document.getElementById('resumeiq-sidebar')`) prevents double-injection on SPA navigation

**DOM construction:** All HTML is built via `document.createElement` (not `innerHTML`) to prevent XSS and comply with Chrome Manifest V3's CSP. Event listeners use `addEventListener` — never `onclick` attributes.

**Script loading order:** `sidebar.js` loads `keyword-engine.js` first via a `<script>` tag injected into `<head>`, waits for it to signal readiness, then runs the keyword match. This ensures the engine is always available before the sidebar attempts to score.

**Sidebar states managed:**
1. `loading` — skeleton UI while job details are extracted
2. `no-resume` — prompts user to select a resume in the web app
3. `keyword-match` — shows instant match score, matched/missing keywords, "Deep AI Analysis" CTA
4. `analyzing` — spinner while backend pipeline runs
5. `results` — full ATS score, semantic score, keyword breakdown, and top recommendations with approve/dismiss
6. `error` — displays failure reason with retry option

### 37.6 Injection via content.js

`injectSidebar()` in `content.js`:
1. Injects `sidebar.css` via `<link>` (using `chrome.runtime.getURL()`)
2. Injects `keyword-engine.js` via `<script>`
3. Injects `sidebar.js` via `<script>`
4. All files are listed in `web_accessible_resources` so `getURL()` resolves them correctly on third-party origins

`autoInjectOnLoad()` handles two cases:
- **Cold load:** `DOMContentLoaded` fires → inject immediately
- **SPA navigation (LinkedIn/Naukri):** `MutationObserver` on `document.body` detects URL change → re-inject after 1.5s debounce (enough for the job page to settle)

**Why MutationObserver over `history.pushState` patching?** LinkedIn and Naukri are SPAs that swap content without a full page reload. Patching `pushState` is fragile and can break site navigation. Observing `body` childList changes is more resilient to framework-level routing choices.

### 37.7 manifest.json — web_accessible_resources

MV3 requires explicit declaration of any extension file fetched via `chrome.runtime.getURL()` on a given match pattern. All four job portals are listed. `config.js` and `icons/*` are also included to support branded elements in the sidebar.

### 37.8 background.js — OPEN_DASHBOARD

The sidebar's "View Full Report" button sends `{ action: 'OPEN_DASHBOARD' }` to the background service worker. The service worker opens `{FRONTEND_URL}/dashboard` in a new tab using `chrome.tabs.create`. This pattern is used because:
- Content scripts cannot call `chrome.tabs.create` directly (restricted API)
- The service worker already holds the frontend URL via `CONFIG.frontendUrl`

### 37.9 popup.js — Sidebar Status Badge

When the popup opens on a job page, it checks whether the sidebar is already injected by sending `{ action: 'SIDEBAR_STATUS' }` to the active tab's content script. If the sidebar is present, the status badge shows **"Sidebar Active"** in green instead of "Ready". This is a visual confirmation that instant scoring is running — not a functional change to the analysis flow.

### 37.10 Security Considerations

- All DOM construction in `sidebar.js` uses `createElement` / `textContent` — never `innerHTML` with untrusted data
- `chrome.storage.local` is used for token access — never `localStorage` for auth
- CORS is not relaxed — the sidebar's deep analysis call uses the same `Authorization: Bearer` header flow as the popup
- `web_accessible_resources` is scoped to exact job portal match patterns — not `<all_urls>`

### 37.11 chrome.runtime Guard Pattern (ERR_FAILED Fix)

**Problem:** After the extension is reloaded or updated from `chrome://extensions` while a job page is already open, `chrome.runtime.id` becomes `undefined`. Any subsequent call to `chrome.runtime.getURL()` returns the literal string `"chrome-extension://invalid"` instead of a real URL. Every `<script src>` and `<link href>` that uses this URL fails with `net::ERR_FAILED`, causing the sidebar to silently mount an empty black panel stuck on "Initializing...".

**Why it's silent:** The browser loads the scripts but the URLs resolve to nothing — there is no JavaScript exception, only a network-level failure. Without `onerror` handlers, the load chain breaks invisibly.

**Fix applied in three places:**

1. **`content.js` — `injectSidebar()` top guard:**
   - Checks `chrome.runtime?.id` before calling `getURL()`. If undefined, logs a warning and returns immediately. No broken URLs ever enter the DOM.

2. **`content.js` — load chain `onerror` handlers:**
   - Each `<script>` and `<link>` tag now has an `onerror` callback that logs a named warning so DevTools clearly identify which resource failed.
   - `config.js` failure is explicitly non-fatal: the `onerror` path calls `loadKeywordEngineAndSidebar()` with the default config already set on `window.__riqConfig`.

3. **`sidebar.js` — IIFE top guard + `checkAuth()` guard:**
   - Top of IIFE: checks `chrome.runtime?.id` before any DOM work — exits cleanly if context is invalid.
   - `checkAuth()`: checks `chrome.runtime?.id` again (context could be invalidated between injection and execution), then also checks `chrome.runtime.lastError` inside the `sendMessage` callback (covers the background service worker being unreachable). Both failure paths call `renderErrorState()` with a human-readable message.

**Why two guard locations in `sidebar.js`?** The IIFE guard covers the case where the extension is reloaded before `sidebar.js` executes. The `checkAuth()` guard covers the rarer case where execution began normally but the context was torn down before the async `sendMessage` callback fired.

**User-visible result:** Instead of a black panel, the user now sees either nothing (if the context was invalidated before the sidebar mounted) or an error message ("Extension disconnected. Please reload the page.") with actionable guidance.

### 37.12 Content Script chrome.tabs Restriction (OPEN_URL Fix)

**Problem:** `sidebar.js` is injected into job pages as a content script via `<script>` tag. Content scripts run in an isolated world and **do not have access to the `chrome.tabs` API**. Calling `chrome.tabs.create()` from a content script throws a silent runtime error — the login button appeared to do nothing.

**Fix:** All tab-opening operations are routed through the background service worker via `chrome.runtime.sendMessage`:

- **`sidebar.js` → `renderLoginState()`:** Sends `{ action: 'OPEN_URL', url: <frontendUrl> }` to background.
- **`background.js` → `OPEN_URL` handler:** Receives the message and calls `chrome.tabs.create({ url })` — the background has full `chrome.tabs` access.

**Why not just give the content script the `tabs` permission?** The `tabs` permission is a sensitive permission that increases user trust friction at install time. The routing pattern adds zero overhead and keeps the permission surface minimal.

**Existing pattern used for consistency:** `OPEN_DASHBOARD` already used this same routing pattern — `OPEN_URL` follows the same convention, just with a dynamic URL instead of hardcoded `/dashboard`.

---

## Section 38 — PostgreSQL Migration & Budget Guard

### 38.1 The Architecture Shift

**Previous:** Hybrid Firestore (NoSQL documents) + Firebase Auth. All user data, resumes, jobs, embeddings, and stats stored in Firestore document collections.

**Current:** Single-node PostgreSQL with `pgvector` for vector storage + Firebase Auth (JWT verification only). All application data now lives in PostgreSQL with ACID guarantees.

**Updated System Diagram:**
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Chrome Ext     │────▶│   FastAPI Backend │────▶│   PostgreSQL     │
│  (Manifest V3)   │     │   (Python 3.11)   │     │  (pgvector:pg16) │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │                        │
┌──────────────────┐              │              ┌─────────┴────────┐
│   React Web App  │──────────────┘              │   Firebase Auth  │
│  (Vite + TW)     │                             │   (JWT only)     │
└──────────────────┘                             └──────────────────┘
```

**Why PostgreSQL over Firestore?**
- **ACID transactions:** Atomic credit deduction and resume updates in a single transaction
- **Row-level locking:** `SELECT ... FOR UPDATE` prevents double-spending of AI credits
- **JSONB:** Preserves the flexible document structure the frontend expects while gaining relational integrity
- **pgvector:** Native vector storage and similarity search, eliminating the need for separate embedding infrastructure
- **SQL aggregation:** Live stats queries replace pre-aggregated Firestore counter documents
- **Single source of truth:** No dual-write complexity, no eventual consistency issues

### 38.2 Database Schema

**Tables (7 total):**

| Table | Purpose | Key Design |
|-------|---------|------------|
| `users` | User identity & plan info | PK = Firebase Auth `uid` |
| `user_credits` | Coin balance per user | `SELECT ... FOR UPDATE` for atomic deduction |
| `coin_transactions` | AI operation audit log | UUID PK, FK to `users` |
| `resumes` | Resume documents | `JSONB` blob for `resume_data` |
| `resume_embeddings` | Cached resume vectors | `Vector(3072)` via pgvector |
| `jobs` | Job analysis results | `JSONB` blob for `job_data` |
| `jd_embeddings` | JD embedding vectors | `Vector(3072)` via pgvector |

**Schema Source of Truth:** `backend/models/postgres_schema.py`

**JSONB Blob Strategy:** Resumes and Jobs store their full document structure as a single `JSONB` column rather than normalized relational tables. This preserves the flexible nested structure (sections → items → bullets) that the frontend expects while gaining ACID guarantees, foreign key constraints, and SQL queryability via JSONB operators.

### 38.3 Budget Guard (`core/budget_guard.py`)

**Problem:** AI operations cost real money. Without atomic credit control, concurrent requests could overdraw a user's balance.

**Solution:** Row-level locking with `SELECT ... FOR UPDATE`:

```python
async def deduct_coins(db: AsyncSession, uid: str, cost: int):
    result = await db.execute(
        select(UserCredit).where(UserCredit.user_id == uid).with_for_update()
    )
    credit = result.scalar_one_or_none()
    if not credit or credit.coins_balance < cost:
        raise HTTPException(402, "Insufficient coins")
    credit.coins_balance -= cost
    await db.commit()
```

**Why this works:** `FOR UPDATE` acquires a row-level lock, preventing any other transaction from reading or modifying the same credit row until the current transaction commits. This guarantees atomicity even under concurrent AI requests.

**Cost Constants:** Defined in `core/constants.py` — each AI operation has a fixed coin cost.

### 38.4 Service Layer Changes

| Service | Before (Firestore) | After (PostgreSQL) |
|---------|--------------------|--------------------|
| `resume_service.py` | `db.collection('users/{uid}/resumes')` | `select(Resume).where(Resume.user_id == uid)` |
| `embedding_service.py` | `db.document('users/{uid}/resumes/{id}').update(embeddingsCache)` | `INSERT INTO resume_embeddings` |
| `analysis_pipeline.py` | `db.collection('users/{uid}/jobs')` | `select(Job).where(Job.user_id == uid)` |
| `model_logger.py` | `db.document('users/{uid}/stats/summary')` atomic increment | `INSERT INTO coin_transactions` |
| `stats router` | Read pre-aggregated Firestore counter doc | Live SQL `SUM()/COUNT()/AVG()` on `coin_transactions` |

### 38.5 Firebase Auth Retention

Firebase Auth remains the **only** Firebase service used. The `firebase_admin_init.py` module:
- Initializes Firebase Admin SDK with service account credentials
- Provides `verify_token()` FastAPI dependency for JWT verification
- Does **NOT** export any Firestore client — the `db` variable has been removed

**Why keep Firebase Auth?** Google Sign-In integration, automatic token refresh, and session management are battle-tested. Rolling our own auth would add complexity with no benefit.

### 38.6 New Backend Files

| File | Purpose |
|------|---------|
| `core/database.py` | SQLAlchemy async engine + session factory |
| `core/budget_guard.py` | Atomic coin deduction with row-level locking |
| `core/constants.py` | Fixed coin costs per AI operation |
| `models/postgres_schema.py` | Full SQLAlchemy schema (7 tables) |
| `models/stats_model.py` | Pydantic response models for stats endpoint |

### 38.7 Docker Infrastructure

`docker-compose.yml` now includes three services:
- `backend`: FastAPI on Python 3.11-slim
- `frontend`: React build served by nginx:alpine
- `postgres`: `pgvector/pgvector:pg16` with healthcheck, persistent volume

The backend depends on `postgres` with `condition: service_healthy` to ensure the database is ready before the app starts. Tables are auto-created on startup via `Base.metadata.create_all()`.

### 38.8 Fresh Start Decision

Data migration from Firestore to PostgreSQL was evaluated and rejected in favor of a fresh start. Rationale:
- The schema shapes differ significantly (nested subcollections vs. JSONB blobs)
- Embedding format changes (Firestore arrays vs. pgvector columns)
- User confirmed preference for clean state over complex migration scripting
- New users automatically receive 100 free coins on first login

---

## Section 39 — Resume Deletion FK Cascade Fix

### 39.1 The Bug

**Symptom:** Resumes deleted from the UI appeared to succeed (HTTP 200 returned, local state updated) but persisted in the PostgreSQL `resumes` table. The frontend's `MyResumes` page would show "No resumes yet" after deletion (due to optimistic local state update), but the Dashboard's resume dropdown — which fetches fresh data from the API — would still list the "deleted" resumes.

**Root Cause:** Two interacting issues in `resume_service.delete_resume()`:

1. **AsyncSession lazy-loading failure:** The `Resume` model defines `embeddings = relationship("ResumeEmbedding", ..., cascade="all, delete-orphan")`. When `db.delete(row)` was called, SQLAlchemy attempted to cascade-delete the child `ResumeEmbedding` rows by lazy-loading the `embeddings` relationship. With `AsyncSession` (asyncpg), lazy loading raises `sqlalchemy.exc.MissingGreenlet` — an unrecoverable error.

2. **Missing database-level cascade:** The `ResumeEmbedding.resume_id` ForeignKey was defined without `ondelete="CASCADE"`. Even if the ORM cascade was bypassed, PostgreSQL's default FK behavior (`RESTRICT`) would block the `DELETE` due to referencing rows in `resume_embeddings`.

The combination meant `db.commit()` failed, the transaction was rolled back, and the resume row survived. The HTTP 500 error was caught by the frontend's `catch` block, but the optimistic UI state update in the `try` block (before the `await`) had already removed the resume from the local React state.

### 39.2 The Fix

**Approach:** Explicitly delete child `resume_embeddings` rows using a raw SQL `DELETE` statement before calling `db.delete(row)` on the parent resume. This bypasses both the lazy-loading issue and the FK constraint violation.

```python
# Explicitly delete child embeddings to avoid FK constraint violation
await db.execute(
    delete(ResumeEmbedding).where(ResumeEmbedding.resume_id == resume_id)
)
await db.delete(row)
await db.commit()
```

**Why not add `ondelete="CASCADE"` to the FK?** That would require an Alembic migration to alter the existing constraint. The explicit delete approach works immediately without schema migration and is more explicit/debuggable. The FK-level cascade can be added as a future hardening step.

---

## Section 40 — Formalizing Resume-Job Connections

### 40.1 The Change
To improve relational integrity and simplify querying, a formal `resume_id` column was added to the `jobs` table. Previously, the link between a job analysis and the resume used was stored exclusively within the `job_data` JSONB blob.

### 40.2 Design Decision: Relational vs. Snapshot
While the system still uses a **Snapshot Architecture** (copying `resumeTitle` into the job JSON to preserve historical data if a resume is deleted), the addition of a formal (but nullable) `resume_id` column provides:
1. **Performance:** Efficient SQL-level filtering for jobs by resume (e.g., during resume deletion cleanup).
2. **Clarity:** A clear database schema that explicitly shows the relationship between analysis results and their source resumes.
3. **Resilience:** Easier identification of "orphaned" analyses (jobs pointing to non-existent resumes).

### 40.3 Implementation Details
- **Schema:** `ALTER TABLE jobs ADD COLUMN resume_id VARCHAR`.
- **Pipeline:** `analyze_resume_vs_jd` now populates this column during both creation and re-analysis.
- **Service:** `delete_resume` was optimized to use this indexed column for targeting job updates, replacing a previously inefficient Python-side filter.

---

## Section 38 — Robust Recommendation Application & Multi-Strategy Matching

**Problem:** Approving AI-generated recommendations (bullets, skills, summary) frequently failed when the resume structure drifted from the original analysis snapshot or when dealing with complex nested objects like skill categories.

**Decision:** Implement a multi-strategy application pipeline with ID-priority and text-based fallback, explicitly handling heterogeneous data shapes (bullets vs. skill arrays).

**Implementation (`backend/routers/jobs.py` & `analysis_pipeline.py`):**
- **ID Resolution (`_find_bullet_ids`):** At analysis time, the pipeline now preemptively resolves `sectionId` and `bulletId` for every recommendation. If a recommendation is an addition (e.g., `add_skill`), it uses a `"new"` sentinel ID.
- **Strategy 1: Direct Type-Based (Summary):** Recommendations of type `summary` or `add_section` (with sid='meta') bypass searching and update `resume_data["meta"]["summary"]` directly.
- **Strategy 2: ID-Based (Exact Match):** 
    - **Experience/Projects:** Matches `bulletId` within section-level or item-level bullet arrays.
    - **Skills:** Matches `categoryId` within the `categories` array.
- **Strategy 3: Skills Parsing (Legacy & Additions):** 
    - If `bulletId == "new"` or `type == "add_skill"`, the pipeline parses the `suggestedText` using a semicolon/colon grammar (e.g., `"Category: Item 1, Item 2; Category 2: Item 3"`).
    - It performs an upsert: if a category label already exists, it updates the items; otherwise, it appends a new category with a fresh UUID.
- **Strategy 4: Text-Based Fallback (Drift Protection):** If IDs fail to match (e.g., section was moved or renamed), the pipeline falls back to normalized text matching against `currentText`.
- **Persistence (SQLAlchemy JSONB):** Explicitly calls `flag_modified(row, "resume_data")` before `db.commit()`. This is critical because SQLAlchemy does not automatically track mutations inside a JSONB blob.

**Why this works:** It provides "graceful degradation" — exact ID matches are fast and precise, while text-based fallbacks and grammar-aware skills parsing ensure that recommendations remain actionable even if the user has made manual edits to the resume since the last analysis run.

---

## Section 39 — Billing & Subscription System

**Problem:** ResumeIQ needed a monetization layer with subscription plans, coin management, top-up packs, and payment processing while maintaining the existing coin-based budget guard system.

**Decision:** Implement Razorpay Standard Checkout with a dual coin pool model (subscription coins + top-up coins) and server-side order creation/verification.

### Architecture

**Dual Coin Pools:**
- `coins_balance` — Subscription coins. Reset each billing cycle. Deducted first.
- `topup_coins_balance` — Top-up coins. Never expire. Deducted after subscription pool is empty.
- `budget_guard.py` uses `SELECT ... FOR UPDATE` row-level locking with the deduction priority: subscription → top-up → HTTP 402.

**Subscription Plans:** Free (100 coins/mo, 1 resume) → Starter (₹415/mo) → Pro (₹1245/mo) → Growth (₹2490/mo, unlimited resumes).

**Billing Cycles:** Monthly (1×), Quarterly (1.10× bonus), Biannual (1.15× bonus).

**Top-up Packs:** Small (5K), Medium (12K), Large (25K). Only available on paid plans.

### Payment Flow
1. Frontend calls `POST /api/billing/subscription/order` or `POST /api/billing/topup/order`.
2. Backend creates a Razorpay order via SDK (`asyncio.to_thread`), stores a `pending` `PaymentTransaction`.
3. Frontend opens Razorpay Standard Checkout with the returned `orderId`.
4. On success, frontend sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to `POST /api/billing/verify`.
5. Backend verifies HMAC-SHA256 signature, credits coins to the correct pool, creates/updates `Subscription`, updates `User.plan_type`.
6. The `process_verified_payment` function is idempotent — re-processing a `success` transaction returns the cached result.

### New Files
| File | Purpose |
|---|---|
| `backend/models/billing_model.py` | Pydantic request/response models for billing endpoints |
| `backend/models/postgres_schema.py` | Added `SubscriptionPlan`, `Subscription`, `TopUpPack`, `PaymentTransaction` tables; extended `UserCredit` with `topup_coins_balance`, `coins_granted_this_period`, `period_start`, `ai_cost_usd_total` |
| `backend/services/billing_service.py` | Core billing logic — Razorpay integration, coin calculation, order creation, payment verification, catalog seeding |
| `backend/routers/billing.py` | 6 API endpoints: `/status`, `/plans/catalog`, `/subscription/order`, `/topup/order`, `/verify`, `/subscription/cancel` |
| `backend/scripts/migrate_add_billing_columns.py` | One-time migration for new columns on `user_credits` |
| `backend/core/budget_guard.py` | Updated with dual-pool deduction logic |
| `frontend/src/pages/Plans.jsx` | Plans & Billing page with plan cards, top-up packs, payment history, Razorpay checkout |
| `frontend/src/components/billing/CoinBalance.jsx` | Sidebar coin balance widget |
| `frontend/src/lib/api.js` | Extended with 6 billing API methods |

### Environment Variables
- Backend: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Frontend: `VITE_RAZORPAY_KEY_ID`

### Security
- Razorpay key secret NEVER exposed to frontend.
- All billing routes use `verify_token` dependency.
- Signature verification uses `hmac.compare_digest` (timing-safe).
- `process_verified_payment` is idempotent to protect against webhook/retry duplicates.
- Top-ups blocked for free-plan users at the API level.

---

## Section 41 — Razorpay Webhooks

**Problem:** The existing billing system relied solely on the frontend `/verify` callback to confirm payments. This is fragile — if the user closes their browser mid-payment, the backend never processes the successful charge. Razorpay webhooks provide server-to-server notification of payment and subscription lifecycle events, ensuring no payment is missed.

**Decision:** Add a `POST /api/billing/webhook/razorpay` endpoint that receives, verifies, and idempotently processes Razorpay webhook events. This complements (does not replace) the existing frontend verify flow — whichever fires first credits the coins.

### Why Webhooks Are Complementary to Checkout Verification

The frontend `/verify` flow and webhooks serve the same purpose (confirm payment, credit coins) but cover different failure modes:

| Scenario | Frontend /verify | Webhook |
|---|---|---|
| User completes checkout normally | ✅ Handles | ✅ Also fires |
| User closes browser after paying | ❌ Missed | ✅ Handles |
| Network failure on callback | ❌ Missed | ✅ Handles |
| Subscription renewal (recurring) | ❌ N/A | ✅ Only source |
| Subscription cancellation (external) | ❌ N/A | ✅ Only source |

Both paths call the same idempotent coin-credit logic — processing the same payment twice never double-credits.

### Webhook Signature Verification

Per Razorpay docs: the raw request body must NOT be parsed or cast before signature verification.

```
signature = HMAC-SHA256(raw_body, RAZORPAY_WEBHOOK_SECRET)
compare_digest(computed_signature, X-Razorpay-Signature header)
```

- The `X-Razorpay-Signature` header contains the expected HMAC.
- `RAZORPAY_WEBHOOK_SECRET` is set in the Razorpay Dashboard and stored server-side only.
- Invalid signatures return HTTP 400 immediately.

### Idempotency Strategy

Duplicate webhook deliveries are expected (Razorpay's documented behavior). Prevention uses three layers:

1. **Event ID uniqueness:** `x-razorpay-event-id` header is stored in `payment_transactions.webhook_event_id` (UNIQUE column). A second delivery of the same event is rejected at the DB level.
2. **Transaction state guards:** Before crediting coins, the processor checks `PaymentTransaction.status`. If already `success`, it returns a duplicate response without modifying state.
3. **Period-based renewal guards:** For `subscription.charged`, the processor checks whether a renewal `PaymentTransaction` with the same `razorpay_payment_id` already exists before crediting.

### Events Handled

| Event | Action |
|---|---|
| `payment.authorized` | Log only — no coin credit (Standard Checkout handles capture) |
| `payment.captured` | Credit coins if tx still pending; skip if already success |
| `payment.failed` | Mark tx failed; never downgrade a success to failed |
| `order.paid` | Reconciliation — credit if tx still pending |
| `subscription.activated` | Mark subscription active if in weaker state |
| `subscription.charged` | **Key renewal event** — reset subscription coins, extend period, create renewal tx |
| `subscription.cancelled` | Mark cancelled; keep access until `period_end` |
| `subscription.paused` | Update status to paused |
| `subscription.resumed` | Reactivate to active |
| `subscription.halted` | Mark halted (payment problem) |
| `subscription.completed` | Mark completed/expired, prevent future cycles |

### Subscription Renewal Logic (subscription.charged)

This is the most critical webhook event. When fired:

1. Load the subscription by `razorpay_sub_id`.
2. Load the plan to compute `calculate_coins_for_period(plan, billing_cycle)`.
3. Check idempotency — does a renewal tx with the same `razorpay_payment_id` exist?
4. Lock `UserCredit` with `FOR UPDATE`.
5. Reset `coins_balance` to the new period's allocation.
6. Update `coins_granted_this_period`, `period_start`, `billing_cycle_end`.
7. Extend `Subscription.period_start` and `period_end` by the correct duration.
8. Create an audit `PaymentTransaction` with `transaction_type = 'subscription_renewal'`.

Billing cycle durations: Monthly = 30 days, Quarterly = 90 days, Biannual = 180 days.

### Database Safety

- All state-changing logic runs inside a single DB transaction.
- `SELECT ... FOR UPDATE` on `UserCredit` and `Subscription` rows prevents concurrent modifications.
- A single `commit()` at the end ensures atomicity.
- On error, the transaction is rolled back and the webhook returns 200 (to prevent Razorpay retry storms that would mask the real issue).

### New/Modified Files

| File | Change |
|---|---|
| `backend/services/webhook_service.py` | **Created** — signature verification, event dispatch, all handlers |
| `backend/routers/webhooks.py` | **Created** — `POST /api/billing/webhook/razorpay` (no auth) |
| `backend/main.py` | **Modified** — mounted `webhooks.router` |
| `backend/models/postgres_schema.py` | **Modified** — added `webhook_event_id`, `webhook_event_type`, `webhook_status`, `raw_webhook_json`, `razorpay_invoice_id` to `PaymentTransaction` |
| `backend/scripts/migrate_add_billing_columns.py` | **Modified** — added ALTER TABLE for new webhook columns |

### Security Notes

- The webhook route does NOT use `verify_token` — it uses HMAC signature verification instead.
- `RAZORPAY_WEBHOOK_SECRET` is never exposed to the frontend.
- The route returns 200 even on internal errors to prevent Razorpay from retrying infinitely; errors are logged for investigation.
- `hmac.compare_digest` is used for timing-safe comparison.

---

## Section 42 — Local Webhook Testing (Cloudflare Tunnel)

**Problem:** Razorpay cannot deliver webhooks to `localhost`. During local development, the backend must be reachable through a public HTTPS URL.

**Decision:** Use Cloudflare Quick Tunnel (`cloudflared tunnel --url http://localhost:8000`) to create a temporary public URL that forwards to the local FastAPI server. The tunnel URL is stored in `WEBHOOK_PUBLIC_URL` and printed at startup for easy copy-paste into the Razorpay Dashboard.

### How It Works

1. Developer starts FastAPI locally on port 8000.
2. Developer runs `cloudflared tunnel --url http://localhost:8000` in a separate terminal.
3. Cloudflare generates a temporary `https://xxx.trycloudflare.com` URL.
4. Developer sets `WEBHOOK_PUBLIC_URL` in `backend/.env` and restarts the backend.
5. On startup, `core/webhook_config.py` prints the full webhook URL: `https://xxx.trycloudflare.com/api/billing/webhook/razorpay`.
6. Developer pastes this URL into Razorpay Dashboard webhook settings.
7. Razorpay sends webhook events to the tunnel, which forwards them to `localhost:8000`.

### Why Cloudflare Quick Tunnel

- No account or login required.
- Immediate public HTTPS URL.
- Works on Windows, macOS, and Linux.
- Free for development use.
- Tunnel URL changes on each restart (acceptable for dev).

### New/Modified Files

| File | Change |
|---|---|
| `backend/core/webhook_config.py` | **Created** — reads `WEBHOOK_PUBLIC_URL`, prints full webhook URL at startup |
| `backend/main.py` | **Modified** — calls `print_webhook_url()` during startup event |
| `backend/.env` | **Modified** — added `WEBHOOK_PUBLIC_URL` |
| `backend/.env.example` | **Modified** — added `WEBHOOK_PUBLIC_URL` template |
| `docs/LOCAL_WEBHOOK_TESTING.md` | **Created** — step-by-step local testing guide |

---

## Section 38 — Webhook Automation & Environment Resolution

### 38.1 dev_start.py Strategy

**Problem:** The `dev_start.py` script (introduced for webhook automation) used `sys.executable` to start the FastAPI backend. In many local development environments, `sys.executable` points to the system-wide Python interpreter rather than the project's virtual environment (`venv`). This led to `ModuleNotFoundError` for packages like `razorpay` that were only installed inside the `venv`.

**Decision:** Implement explicit virtual environment discovery logic within the automation script.

**Implementation (`dev_start.py`):**
- **Dynamic Resolution:** The `run_backend()` function now actively looks for the `venv` folder within the `backend/` directory.
- **Cross-Platform Compatibility:** It checks for `Scripts/python.exe` (Windows) and `bin/python` (Linux/macOS).
- **Fallback:** If a virtual environment is not found, it gracefully falls back to `sys.executable` as a last resort.

**Why this works:** It ensures that the backend always starts using the correct environment where dependencies are installed, regardless of how the parent script was invoked. This significantly improves the reliability of the local development "one-click" startup experience.



## Section 38 � Global Layout & Scroll Strategy Fix

**Problem:** The initial dashboard layout used a " contained app\ model where AppLayout was fixed to 100vh and forced internal scrolling on child pages (like Dashboard and My Resumes). However, pages with variable-height content (like the Plans page with new top-up sections or the Settings page) lacked their own internal scroll containers, causing content to be cut off and unreachable.

**Decision:** Transition the global AppLayout from a fixed-height container to a minimum-height container with automatic vertical overflow. This shifts the primary scroll responsibility to the parent layout while remaining backward compatible with pages that still use internal scrolling.

**Implementation (AppLayout.jsx):**
- Changed height: 100vh to min-height: 100vh on the main content area.
- Replaced overflow: hidden with overflow-y: auto.

**Why this works:** It provides a universal safety net for all pages. If a page implements its own internal scrolling (like Dashboard.jsx), it continues to work as it fills the 100vh parent. If a page does not implement internal scrolling (like Plans.jsx), the AppLayout parent now correctly handles the overflow, ensuring all content is accessible across the entire application without requiring per-page layout logic.


## Plans & Billing Page Redesign (May 2026)

**Context:** The plans and billing page was redesigned to provide a more premium, high-conversion experience, moving away from a flat UI to a more dynamic and visually structured layout.

**Key Changes:**

1. **Redesigned Header & Layout:** Added a clear, centered call-to-action section above the pricing table to improve focus.
2. **Animated Billing Toggle:** Replaced standard buttons with a pill-style toggle using Framer Motion's `layoutId`. This provides a smooth, tactile transition between billing cycles (Monthly, Quarterly, Biannual).
3. **Plan Hierarchy & Badges:** 
   - Introduced visual badges for 'Most Popular' (Pro) and 'Best Value' (Growth).
   - Used scaling and border accents (`lg:scale-105`, high-contrast borders) to guide the user's eye toward higher-value plans.
4. **Dynamic Coin Bonus Box:** Added a visualization for bonus coins earned through longer-term commitments (+10% for Quarterly, +15% for 6-Months), making the value proposition immediate.
5. **Premium Coin Top-Ups:** 
   - Completely overhauled the top-up packs with a high-contrast card design.
   - Added a 'Popular' badge and a detailed 'Cost per Operation' table to ensure pricing transparency.
6. **Interactive FAQ Accordion:** Implemented a Framer Motion-powered accordion to address common billing questions directly on the page, reducing friction.

**Rationale:** These changes align the Plans page with modern SaaS aesthetics (e.g., glassmorphism-lite, smooth spring animations) while explicitly highlighting the 'Commit longer, earn more' strategy through visual feedback. No changes were made to existing API logic or state management to ensure stability.


**Architectural Refactor (Code Style Compliance):**

- Following the 'Hard Rules' in AGENTS.md regarding component size (under 200 lines), the redesigned Plans page was refactored into a modular architecture.
- **Sub-components Created:** `PlanCard.jsx`, `TopUpSection.jsx`, `FaqSection.jsx`, and `BillingComponents.jsx`.
- **Global Integration:** Migrated local toast state to the global `useToast` hook provided by `ToastProvider` to ensure UI consistency.
- **Benefit:** This structure significantly improves maintainability and allows for granular testing of pricing logic and UI elements without overloading the main Page component.

### Plans Page UI Redesign (Premium Refresh)

**Objective:** Complete UI overhaul of the Plans & Billing experience to match a premium SaaS aesthetic and improve conversion through visual hierarchy.

**Key Changes:**
- **PlanCard.jsx:** Rewritten with a theme-based system (Free, Starter, Pro, Growth). Implemented light lavender gradients, bold typography (black for prices, purple for Pro accents), and distinct coin bonus pills as per user-provided pixel spec.
- **Visual Hierarchy:** Centered and elevated the " Most Popular\ (Pro) and \Best Value\ (Growth) badges using absolute positioning and high-contrast pills.
- **BillingToggle.jsx:** Redesigned with a spring-animated purple pill and integrated bonus labels (e.g., \Save 15%\) directly into the inactive states to nudge users.
- **Typography:** Shifted to a more aggressive font-weight hierarchy (black weights for key values) and increased spacing for better readability.

**Rationale:** The previous UI was functional but lacked the \wow factor\ required for a premium tool. The new design uses subtle borders, shadow-glow effects, and theme-consistent colors to create a more trustworthy and high-end feel, directly matching the requested Pro card design.

### Privacy Policy Implementation (May 16, 2026)

**New File:** rontend/src/pages/PrivacyPolicy.jsx`n
**Changes:**
- Created a high-fidelity Privacy Policy page with a hero section, sticky sidebar navigation, and card-based content layout.
- Added public route /privacy-policy in App.jsx.
- Updated the landing page footer to link to the new route.

**Rationale:** Required for Google OAuth and Chrome Web Store compliance. The design uses premium aesthetics (glassmorphism, subtle gradients, and sticky navigation) to maintain brand consistency even for legal pages. The content specifically addresses Chrome Extension data collection as requested.

### Collapsible Sidebar Implementation (May 16, 2026)

**Changes:**
- Modified `AppLayout.jsx` to manage `isCollapsed` state, persisted in `localStorage`.
- Updated `Sidebar.jsx` with a smooth transition (300ms) and a floating toggle button.
- Implemented icon-only mode for navigation links and user profile when collapsed.
- Created a compact variant of `CoinBalance.jsx` showing only coin count status.
- Dynamically adjusted `marginLeft` of the main content area to prevent layout shifting.

**Rationale:** Improves the user experience by allowing more screen real estate for core tasks like resume editing and job analysis. The persistence ensures that the user's preference is respected across sessions, providing a customizable dashboard feel.

## Section 39 - Email/Password Authentication & AuthModal Refactor

**Context:** Expanded authentication options to include Email/Password alongside Google OAuth. This reduces friction for users who prefer traditional login methods or don't use Google accounts.

**Key Changes:**

1. **AuthContext & Firebase SDK:**
   - Updated `firebase.js` to include `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendPasswordResetEmail`, and `updateProfile`.
   - Enhanced `AuthContext.jsx` with `signInWithEmail`, `signUpWithEmail`, and `resetPassword` methods.
   - `signUpWithEmail` includes support for `displayName` updates via `updateProfile`, ensuring new users have immediate identification.

2. **AuthModal.jsx Implementation:**
   - Introduced a unified, premium modal for all authentication flows.
   - **Features:**
     - Tabbed interface (Login/Register).
     - "Forgot Password" flow with success feedback.
     - Password visibility toggle.
     - Integration with Google Sign-In as a secondary action (separated by an "OR" divider).
     - Context-aware error mapping (e.g., "auth/user-not-found" -> user-friendly message).
   - **Aesthetics:** Uses `framer-motion` for spring-animated entry, `bg-card` for container, and `shadow-glow` for a premium, floating feel.

3. **Landing Page Refactor:**
   - Replaced direct `signInWithPopup` calls on "Get Started" buttons with a toggle for `AuthModal`.
   - This provides a more polished "walled garden" entry point where users can choose their preferred method.

**Rationale:** Moving to a modal-based flow centralizes auth logic and prevents the jarring experience of immediate popup triggers. The support for email/password is handled identically to Google OAuth in the backend: `onAuthChange` intercepts the new Firebase user, retrieves the ID token, and `api.getMe()` automatically handles the PostgreSQL user/credit record creation if it's a first-time login. This ensures parity across all authentication providers.

### Firebase Auth Error Handling & Password Hint (2026-05-16)

**Objective:** Improve UX during authentication by providing specific, actionable error messages and clear password requirements.

**Changes:**
- **Enhanced handleAuthError:** Expanded the error mapping in AuthModal.jsx to cover specific Firebase codes like auth/invalid-credential, auth/password-does-not-meet-requirements, auth/too-many-requests, and auth/network-request-failed.
- **Password Requirements Hint:** Added a visual hint under the password field during Sign-Up (isSignUp === true) specifying the required complexity (8+ characters, uppercase, number, special char).

**Rationale:** Generic error messages like 'An unexpected error occurred' lead to user frustration. By mapping internal Firebase codes to human-readable strings, users can immediately identify if they need to check their internet, reset a password due to a lock, or fix a typo. The password hint proactively reduces 'Password does not meet requirements' errors by setting expectations before submission.

### AI Service Overload Error Handling (2026-05-16)

**Objective:** Gracefully handle transient failures from Google AI services (429, 500, 503) to prevent cryptic error messages.

- **Backend:** Implemented GemmaOverloadError and a global FastAPI exception handler to return a structured JSON response with code AI_OVERLOAD.
- **Retry Logic:** Added a single retry with a 2-second sleep in gemma_service.py for transient AI errors before bubbling up the exception.
- **Frontend:** Updated pi.js to parse structured error codes and modified Dashboard.jsx and InterviewPrepPanel.jsx to catch AI_OVERLOAD and display friendly toast messages.

**Rationale:** AI services often experience transient high demand. Returning a structured AI_OVERLOAD code allows the frontend to distinguish between a broken backend and a busy AI provider, enabling specific UX (like 'Please try again in a few moments') that reduces user panic and support tickets.


### AI Error Handling & Resilience (2026-05-17)

**Objective:** Standardize AI service-level and router-level exception handling for transient errors (overloads and timeouts) to ensure seamless API propagation, consistent HTTP mappings, and comprehensive unit/integration test coverage.

#### 1. Status Code Mapping Decisions
We distinguish between the two primary failure modes of Google AI (GenAI / Gemini):
*   **HTTP 503 Service Unavailable (`AI_OVERLOAD`):** Triggered by definitive rate limiting or overload indicators (e.g., HTTP status `429` / `503` or keywords like `overloaded`, `quota`, `rate limit`, `high demand`). This indicates that the AI service is functional but has reached its capacity limit.
*   **HTTP 504 Gateway Timeout (`AI_TIMEOUT`):** Triggered by backend network timeouts, deadline exceedance (e.g., status `504` or keywords like `deadline exceeded`, `timed out`, `timeout`). This indicates that the AI service failed to respond within a reasonable window.

#### 2. Exception Classification & Propagation Flow
To avoid catching generic 500 server errors as AI overloads (which would misrepresent local bugs as AI outages), a deterministic classification rule is enforced:
1.  **Parsing & Detection:** The `is_ai_transient_error` helper extracts error codes (`429`, `503`, `504`) and performs lowercase substring checks against specific transient keywords. High-priority checks for timeouts are evaluated first.
2.  **Transient Resilience:** When a transient error is caught at the service layer (`gemma_service`, `embedding_service`), the pipeline automatically retries **once** after a `2.0 second` asynchronous delay (`asyncio.sleep`).
3.  **Custom Exception Raising:** If the second attempt fails, a `GemmaOverloadError` exception is raised with the appropriate HTTP status code (`503` or `504`) and standard user-facing message.
4.  **Bypassing General Catch blocks:** Every relevant endpoint (e.g., `/analyze`, `/resumes/import-pdf`, `/jobs/{job_id}/interview-prep`) explicitly raises `GemmaOverloadError` via `except (HTTPException, GemmaOverloadError): raise` to ensure it isn't swallowed and mapped to a generic `500 Internal Server Error`.
5.  **Global Exception Handler:** The global FastAPI handler intercepting `GemmaOverloadError` packages the error into a structured JSON response containing:
    *   `code`: either `"AI_OVERLOAD"` or `"AI_TIMEOUT"`.
    *   `message`: A friendly, context-specific description.
    *   `detail`: A clear warning indicating that Google AI Studio is under high demand or timed out, reducing user friction.

#### 3. Verification & Integration Testing
We implemented robust test cases under `backend/scratch/test_error_handling.py` executing:
*   **Service-level Mocks:** Mocking `google-genai` content and embedding methods to raise API errors and asserting that retries occur, sleep is called, and `GemmaOverloadError` is correctly raised with code `503` / `504`.
*   **FastAPI Router Integration:** Using `FastAPI`'s `TestClient` to mock requests triggering the handler and asserting that HTTP statuses are correctly mapped, payload keys (`code`, `message`, `detail`) are verified, and the API contract is fully satisfied.


### Premium Toast & Badge Visual Redesign (2026-05-17)

**Objective:** Redesign the Toast notifications and standard label Badges to look highly premium, modern, and prominent, addressing user feedback regarding visibility, transparent blocks, text contrast, and interactivity.

#### 1. Toast Notification Redesign Decisions
- **Reposition to Top-Center:** Moved the container from the bottom-right corner to the top-center (`fixed top-6 left-1/2 -translate-x-1/2`). This is the industry-standard for prominent, highly-noticeable system feedback.
- **Glassmorphism Styling:** Applied a modern `backdrop-blur-xl`, subtle borders (`border-emerald-500/20`, etc.), and custom color scales combined with soft shadow glows (`shadow-[0_8px_30px_...]`). This eliminates the low-contrast transparent blocks with black text.
- **Micro-animations:** Added smooth slide-down and fade-in animations (`animate-in fade-in slide-in-from-top-4 duration-300`) leveraging utility frameworks.
- **Dedicated ToastItem Sub-component:**
  - **Pause-on-Hover:** Moved timer logic to a dedicated `ToastItem` component. Hovering over a toast pauses its auto-dismiss timer, and mouse exit resumes the timer with only the remaining duration.
  - **Early Dismissal:** Added a micro-animated "x" close button on the right for immediate user dismissal.
  - **Stacking Limit:** Enforced a maximum of **3 active toasts** in the queue to prevent screen flooding.
- **Extended Durations:** Standard notifications show for 5 seconds (5000ms), while warnings and errors remain for at least 6 seconds (6000ms) to ensure readability.

#### 2. Premium Badge Redesign Decisions
- Replaced outdated and uncompilable color names (`orange-dim`, `green-dim`, `red-dim`) with vibrant, premium standard CSS color mappings:
  - **green:** Emerald scale with light border and high-contrast text.
  - **orange:** Amber scale with subtle background and crisp contrast.
  - **red:** Rose scale for noticeability.
  - **blue:** Sky scale.
- Unified styling across all templates and screens.


## Section 30 — Coin Exhaustion UX & Redirection

### 30.1 Global Coin Exhaustion Detection & Redirection
To improve the upgrade/top-up funnel, we integrated a global "Top Up Coins" action that triggers whenever a coin exhaustion error is encountered:
- **FastAPI Backend (budget_guard.py):** Returns an `HTTP 402` status with a descriptive error message (`Not enough coins — top up or upgrade your plan`) when user operation budget is exhausted.
- **Frontend App Navigation (App.jsx & Plans.jsx):**
  - Updated React routing so `/pricing` maps to the billing `<Plans />` page.
  - Detects `?highlight=popular` in URL query parameters, automatically scrolls the viewport smoothly down to the Top-Up pack section, and applies a prominent animated border/glow styling to the medium/most popular pack card.
- **Surface 1: Toast Integration (Toast.jsx):**
  - If a toast error containing "insufficient coins" or "not enough coins" is rendered, a prominent "Top Up Coins" button is dynamically appended.
  - Clicking this button invokes the React Router to navigate directly to `/pricing?highlight=popular` and dismisses the toast.
- **Surface 2: Extension Popup (popup.js):**
  - Caught 402/coin error codes in the deep analysis catch block, appending a styled "Top Up Coins" button directly into the error container.
  - Clicking this button calls `chrome.tabs.create` opening `<frontendUrl>/pricing?highlight=popular`.
- **Surface 3: Extension Sidebar (sidebar-ui.js):**
  - The `renderErrorCard` function accepts an `isCoinExhaustion` flag and injects a "Top Up Coins" button when true.
  - `fetchResumesAndBuild` catches credit/coin load failures, passes the coin exhaustion flag, and binds a listener to proxy tab navigation to the pricing page.


## Section 31 — Cross-World Token Sync & Live Sidebar Authentication Updates

### 31.1 Isolated-World Token Sync Solution
In Chrome Extension Manifest V3, content scripts run in an isolated JavaScript context separate from the host page. Consequently, content scripts cannot read variables or `localStorage` set by the main page. To synchronize authentication state between the web app (`localhost:5173`) and content scripts (like `auth-sync.js`):
- **Web App Auth Context (`AuthContext.jsx`):** Whenever the user logs in, logs out, or refreshes their authentication token, the web app sets a custom attribute `data-resumeiq-token` directly on the `document.documentElement` element (for logouts, it removes the attribute).
- **Extension Synchronization (`auth-sync.js`):**
  - Instead of polling `localStorage` periodically, the content script observes attributes on the shared `document.documentElement` using a `MutationObserver`.
  - When the `data-resumeiq-token` attribute changes, the observer fires and immediately dispatches `SYNC_TOKEN` or `CLEAR_TOKEN` messages to `background.js` to update `chrome.storage.local`.

### 31.2 Live Tab Refresh-Free Sync
- **Sidebar Real-time Updates (`sidebar-ui.js`):**
  - Registered a listener for `chrome.storage.onChanged` inside the content script context.
  - When the background script updates `resumeIqToken` in `chrome.storage.local` (from a login/logout action on the web app tab), all active sidebars on job search sites (LinkedIn, Indeed, etc.) receive the event.
  - The sidebars automatically re-evaluate their login status, updating and rendering either the resume list or the login card immediately without requiring the user to refresh the page.

### 31.3 Stale Auth / Expiry Protection
- If the token stored in extension storage expires or is invalid, the backend API requests to `/api/resumes` return `401 Unauthorized` or `403 Forbidden`.
- The sidebar catch block intercepts these status codes, triggers a `CLEAR_TOKEN` dispatch to invalidate the stale token in storage, and gracefully replaces the error view with the standard Login card.

- **Context Invalidation Protection**
- **Stale Content Scripts:** When the user reloads or updates the extension from `chrome://extensions`, any content script running in an already opened tab (like LinkedIn, Indeed, Naukri) is immediately disconnected from the background script.
- **Graceful Failure Handler (`safeSendMessage`):** To prevent constant console errors like `chrome-extension://invalid/` or uncaught exceptions, we wrap all message dispatches in a wrapper function `safeSendMessage`.
- **Early Exit Guards:** Added `if (!chrome.runtime?.id)` check at the top of content script initialization, navigation listeners, storage change observers, and fetch routines to immediately disconnect observers and cease operations if the extension is reloaded or disabled.

## Section 43 — Auto-Branching Base Resume System

**Rationale:** To prevent the accidental corruption of a user's master resume when they approve AI recommendations for specific jobs, we introduced the concept of Base vs Tailored resumes.

**Implementation:**
- **Dual-Storage Flag:** The `is_base` status is tracked both as a boolean column in PostgreSQL (for fast filtering) and within the JSONB `resume_data` (for API delivery). These are kept in sync atomically.
- **Fork Idempotency:** When `update_recommendation` fires an `approve` action on a base resume, the backend clones it (`duplicate_resume_for_tailoring`), relinks the job's `resumeId` to the new clone, and then applies the bullet edits. Subsequent approves for the same job check the new clone, see `isBase=False`, and apply changes directly.
- **Lineage Tracking:** `source_resume_id` column points back to the base resume a tailored copy was forked from.
- **API & UX:** `PATCH /api/resumes/{id}/base` allows toggling the state manually from the dashboard. The extension and dashboard UI group resumes strictly into `⭐ Master` and `📋 Tailored` lists.

---

## Section 44 — Study Center Feature

**Problem:** Users requested gated educational content for system design and OOD interviews to complement the resume builder.
**Decision:** Implemented a new `study_center` module following hard-isolation rules, interacting only with `core/` and the shared Base models.

**Backend Implementation:**
- **Models:** Created `Course`, `Chapter`, `Enrollment`, and `ChapterProgress` extending `postgres_schema.Base`. This ensures they are auto-created by `Base.metadata.create_all` during startup.
- **Service Layer:**
  - In-memory content cache (`_content_cache`) for markdown files to avoid repeated disk reads.
  - Manual coin deduction for enrollments using `FOR UPDATE` lock, as course costs are variable (unlike `FIXED_COST` operations).
- **Seed Script:** A script to upsert courses and chapters into the database, setting free chapters and processing course metadata.
- **Content:** Generated markdown stubs for 45 chapters (System Design and OOD) using a Python script (due to LLM quota exhaustion on subagents).

**Frontend Implementation:**
- **Pages:**
  - `StudyCenter.jsx`: Landing page listing courses with enroll/continue buttons.
  - `CourseOverview.jsx`: Details page showing chapter list, progress ring, and enrollment status.
  - `ChapterReader.jsx`: Content reader using `react-markdown` and `remark-gfm` with custom `DiagramBlock` for Mermaid and ReactFlow diagram placeholders.
- **Design System:** Designed with Stitch. Implemented using standard Tailwind classes (indigo/purple gradient aesthetics, clean layout) following ByteByteGo inspiration.
- **API Helper:** Added 5 methods for fetching courses, chapters, and marking progress.

---

## Section 42 — Roadmap Canvas Redesign: roadmap.sh-Style Custom SVG Renderer

**Problem:** The original `RoadmapCanvas.jsx` used ReactFlow with basic white card nodes — functional but visually poor. Users expected a mind-map-style layout matching roadmap.sh, with curved connections, yellow pill nodes, left/right branching sub-topics, and a rich detail panel.

**Decision:** Replace ReactFlow entirely with a **custom SVG + HTML canvas renderer** that gives us pixel-level control over the visual language, and upgrade the AI prompt to output the rich node fields the panel requires.

### Backend Changes

**`backend/services/roadmap_prompts.py` — `build_roadmap_prompt()`:**

The prompt schema was expanded. Each node now outputs:
- `what` — plain English explanation (2-3 sentences)
- `why` — why this topic matters in the roadmap
- `mastery_check` — one-line self-check statement
- `exercise` — a hands-on mini-project
- `difficulty_note` — string for hard nodes, `null` for normal ones
- `level` — `"beginner"` | `"intermediate"` | `"advanced"`
- `resources` — now an **object** (not array) with typed sub-keys:
  - `video`, `official_docs`, `article`, `practice`, `paid_course`

**Why object instead of array?** Typed keys make the frontend rendering trivial — no need to filter by type. The panel can directly access `resources.video` without loops. Both old (array) and new (object) formats are handled by `normaliseResources()` in the panel component.

**Layout positioning instruction added:** MILESTONE nodes are explicitly told to sit at `x=0` (center spine), TOPIC nodes alternate left (negative x) and right (positive x) of their parent. This produces the roadmap.sh column layout without post-processing.

### Frontend Changes

#### Removed Dependency
- `@xyflow/react` is no longer imported anywhere. The package remains in `package.json` but is unused. It can be removed in a future cleanup pass.

#### New: `components/study_center/RoadmapGraph.jsx`
Custom SVG canvas with:
- **Pan:** `mousedown` + `mousemove` via CSS `transform: translate()`
- **Zoom:** `wheel` event with pinch-point scaling around cursor position
- **Fit-to-view:** Computed on mount by finding node bounds and scaling to 88% of viewport
- **Bezier edges via `<svg>`:** `getCurvePath()` generates cubic bezier paths. Horizontal connections (same-row) bend upward; vertical connections use S-curves. REQUIRED edges are solid indigo with arrowheads; SUGGESTED edges are animated dashed blue.
- **Node pills:** `NodePill` renders as `<div>` absolutely positioned over the SVG. Types: `rg-node-pill--milestone` (indigo), `--topic` (yellow), `--subtopic` (white). Level dot badges (green/purple/dark) appear inside each pill.
- **Phase labels:** Positioned above the first node in each phase cluster.

**Why SVG edges + HTML nodes (hybrid)?** Pure SVG nodes suffer from limited text rendering (no word-wrap, no emoji). Pure HTML nodes can't draw curved connection lines. The hybrid approach is standard in all node graph tools (including ReactFlow itself).

#### New: `components/study_center/roadmap-graph.css`
Standalone CSS module (not Tailwind) for:
- Dot-grid canvas background
- Node hover scale + drop-shadow
- Dashed edge animation (`stroke-dashoffset` keyframe)
- Panel slide-in animation (`translateX(100%) → 0`)
- All resource tag color variants

**Why not Tailwind?** SVG stroke properties and CSS animation on SVG path elements are not well-covered by Tailwind utility classes. Explicit CSS gives precise control over `stroke-dasharray`, `stroke-dashoffset`, and `marker` definitions.

#### Rewritten: `components/study_center/RoadmapNodePanel.jsx`
- **Two tabs:** "Resources" and "Details"
- **Resources tab:** What it is + typed resource links (Official/Video/Article/Practice/Paid tags)
- **Details tab:** Why it matters + Mastery Check + Exercise
- **Status dropdown:** Three states (Pending / In Progress / Done) with colored chips
- **Difficulty note:** Amber alert box for hard nodes
- **Backward compatible:** `normaliseResources()` handles both old array format and new typed-object format — existing roadmaps display correctly without regeneration

#### Rewritten: `pages/RoadmapCanvas.jsx`
- Removed all ReactFlow imports and node/edge state
- Uses `nodeMap` (plain object keyed by node ID) instead of ReactFlow node array
- Progress bar now shows `X/Y nodes` format with gradient fill
- Header uses inline styles (no Tailwind classes) for precise control matching the Stitch-generated design

