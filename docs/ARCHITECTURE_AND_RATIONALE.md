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

### Data Flow (A-Z)
1. User signs in via Google (Firebase Auth) on the web app
2. Frontend receives an ID token from Firebase
3. Every API call includes this token in the `Authorization` header
4. Backend verifies the token via Firebase Admin SDK
5. User creates/edits resumes through the web app
6. Resume data is stored in Firestore under `users/{userId}/resumes/{resumeId}`
7. On resume save, embeddings are computed via `text-embedding-004` and cached
8. Chrome Extension detects job descriptions on LinkedIn/Naukri/Indeed/Internshala
9. Extension triggers the analysis pipeline via `POST /api/analyze`
10. Pipeline uses cached resume embeddings + fresh JD embeddings for semantic matching
11. Gemma 4 rewrites resume bullets to address missing keywords
12. Results are stored in Firestore and displayed in the web app dashboard

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

### Why `text-embedding-004`?
- Completely free, no rate limits that affect our scale
- 768-dimensional vectors — good balance of quality and storage
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
- ~55 units × 768 floats × 4 bytes ≈ 170KB — well under 1MB limit
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
| DELETE | `/api/jobs/{id}` | Delete job | 5 |

---

## 5. Frontend Architecture

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
- Background: `#0A0A0F`, Cards: `#13131A`, Accent: `#4F8EF7`
- Font UI: DM Sans, Font Mono: JetBrains Mono
- All interactive elements: 200ms ease transitions

---

## 6. File Glossary

*Updated as files are created.*

### Root
| File | Purpose |
|------|---------|
| `AGENTS.md` | Persistent agent rules |
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
| `src/App.jsx` | Root component with routing |
| `src/main.jsx` | DOM entry point |
| `src/index.css` | Tailwind + design system |
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
| `src/pages/Landing.jsx` | Landing page with ATS ring |
| `src/pages/Dashboard.jsx` | Job dashboard (stub) |
| `src/pages/MyResumes.jsx` | Resume list with CRUD modals |
| `src/pages/ResumeEditor.jsx` | Two-panel editor with live preview |
| `src/pages/Settings.jsx` | Account settings |
| `src/pages/Admin.jsx` | Model monitoring dashboard (Section 18.2) |

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

### 18.2 Model Usage Monitoring

**Problem:** No visibility into AI token consumption, model latency, or cache effectiveness.

**Decision:** Introduce a `modelLogs` root-level Firestore collection that captures every AI model call (Gemma + Embeddings) with metadata.

**Implementation:**
- `services/model_logger.py` — new fire-and-forget logging function
- Runs in a daemon thread — never blocks the API response
- Logs: `model`, `operation`, `inputTokens`, `outputTokens`, `latencyMs`, `isCacheHit`, `userId`, `timestamp`
- `GET /api/admin/stats` aggregates last 500 logs on-demand
- `src/pages/Admin.jsx` renders the monitoring dashboard

**Why not a time-series DB?** For the current scale, Firestore on-demand aggregation is sufficient. A scheduled Cloud Function job to pre-aggregate can replace this when the collection grows large.

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

**Fix (Backend — `routers/jobs.py`):** `_apply_recommendation_to_resume` now uses **ID-based targeting** (Strategy 1). Text matching remains as Strategy 2 fallback for backwards compatibility with old recommendation objects that pre-date this fix.

**Fix (Frontend — `Dashboard.jsx`):** After any `approve/dismiss/edit` action, the full job detail is **re-fetched from the backend** instead of optimistically updating local state. This ensures the UI always reflects persisted Firestore state, eliminating stale state divergence.
