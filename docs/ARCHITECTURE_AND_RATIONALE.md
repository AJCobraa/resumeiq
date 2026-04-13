# ResumeIQ — Architecture & Rationale

> **Living Document** — Updated as the application evolves.
> This document explains the "why" behind every technical decision.

---

## 1. System Overview

ResumeIQ is a 3-part SaaS application:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Chrome Ext     │────▶│   FastAPI Backend │────▶│   Firestore DB   │
│  (Manifest V3)   │     │   (Python 3.11)   │     │   (NoSQL)        │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
┌──────────────────┐              │
│   React Web App  │──────────────┘
│  (Vite + TW)     │
└──────────────────┘
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
6. Resume data is stored in Firestore under `users/{userId}/resumes/{resumeId}`
7. On resume save, embeddings are computed via `gemini-embedding-001` and cached
8. Chrome Extension detects job descriptions on LinkedIn/Naukri/Indeed/Internshala
9. Extension triggers the analysis pipeline via `POST /api/analyze`
10. Pipeline uses cached resume embeddings + fresh JD embeddings for semantic matching
11. Gemma 4 rewrites resume bullets to address missing keywords
13. /api/jobs/{jobId}/interview-prep analyzes resume gaps vs JD requirements
14. Model predicts likely interview questions and coached answers based on company tier
15. Results are displayed in the dashboard's Interview Prep panel

---

## 2. Technology Choices

### Why Firestore (NoSQL) over PostgreSQL?
- **Zero infrastructure**: No server management, migrations, or connection pooling
- **Real-time ready**: Built-in real-time listeners (future feature)
- **Nested data model**: Resume sections naturally fit a document model
- **Free tier**: Spark plan provides 1GB storage + 50K reads/day at no cost
- **Firebase integration**: Same project as Authentication — single credential

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

### Why Array-Nested Sections (not Subcollections)?
- Resume sections (experience, skills, etc.) are always loaded together
- A subcollection would require 6+ separate reads per resume load
- Arrays allow atomic updates and single-document reads
- Trade-off: max ~55 sections (well within Firestore's 1MB limit)

### Embedding Cache in Firestore (not Redis)
- ~55 units × 3072 floats × 4 bytes ≈ 675KB — well under 1MB limit
- Firestore reads take 20-50ms — fast enough for our use case
- No extra infrastructure, no extra credentials, no extra cost
- Cache is recomputed only when resume content changes

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
| `services/resume_service.py` | Firestore CRUD for resumes |
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
| `content.js` | Extract logic for 4 specific job portals |
| `background.js` | Service worker managing persistent token |
| `popup.html/.js/.css` | 5-state popup logic |
| `auth-sync.js` | Connects React local storage to extension |

---

## Section 18 — JD Caching & Model Monitoring

### 18.1 JD Embedding Cache

**Problem:** Every time a user re-analyzes the same job description (e.g., after updating their resume), the system re-ran expensive JD embedding calls costing tokens and latency.

**Decision:** Cache JD embeddings in the job document using a content hash (MD5 of `jdText`) as the cache key.

**Implementation:**
- `jdHash` field added to `jobs/{jobId}` — MD5 of the raw JD text
- `jdEmbeddingsCache` field stores `{ computedAt, requirements: [{text, embedding}] }`
- `analysis_pipeline.py` runs `_check_jd_cache()` before executing JD embedding
- If hash + URL match, cached embeddings are reused — no AI call made
- `isCacheHit: true` is stored in the job document for observability
- `GET /api/jobs/check?url=` lets the extension pre-check if a URL was previously analyzed

**Why MD5 (not SHA256)?** Sufficient collision resistance for JD text; faster and shorter keys in Firestore.

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

**Problem:** Users wanted to see the value ResumeIQ brings (ROI) and monitor their own AI usage/telemetry without needing access to global admin dashboards.

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
