# ResumeIQ — Persistent Agent Rules
 
## What We Are Building
ResumeIQ: resume builder + Chrome Extension that reads job listings,
scores ATS match, and rewrites resume bullets with one-click approval.
Stack: React + FastAPI + Firestore + Gemma 4 + text-embedding-004 + Puppeteer.
 
## Hard Rules — Never Violate

### Documentation
- The /docs/ARCHITECTURE_AND_RATIONALE.md file is sacred. You must update it whenever a new file is created, a new API endpoint is wired, or a major architectural decision is implemented. It must explain the "why" behind the code.

### Docker + Environment
- Backend runs in python:3.11-slim with Node.js installed for Puppeteer
- /api/health must always exist and return 200 before any other testing
- Never store files permanently in containers — /tmp only for PDF generation
- venv/ is for local dev only — never inside Docker, never committed to git
- Containers are stateless — all state lives in Firestore, never the container
- docker-compose.yml: env_file for backend, build args for frontend
 
### Data
- UUIDs generated server-side ONCE. Never regenerated.
- Frontend NEVER writes to Firestore. All writes through FastAPI.
- Every backend route uses verify_token as a FastAPI Depends.
- embeddingsCache in Firestore is recomputed on every resume save — not on every analysis.
 
### AI Calls
- Package: google-genai (NOT google-generativeai)
- Always retry once with 2s sleep on model call failure
- JSON outputs: set response_mime_type="application/json"
- Never simplify or shorten the recommendation rewrite prompt
 
### PDF Export
- Use Puppeteer (Node.js subprocess) only
- NEVER use html2canvas — it produces image PDFs that ATS cannot read
- Verify text selectability after every PDF export test
 
### Templates
- Templates are display-only React components — they never modify data
- CobraTemplate.jsx must match the pixel spec — do not redesign it
- Only ATS-safe fonts: Arial, Helvetica, Georgia, Times New Roman
 
### Security
- CORS allow_origins: FRONTEND_URL env var only — never "*"
- .env files and config.js are gitignored — never committed
- Firestore security rules must be deployed before any user testing
 
## Code Style
- Plain JavaScript only — no TypeScript
- Functional React components with hooks — no class components
- No Redux — React Context only
- Tailwind for web app UI — inline styles for template components only
- Components under 200 lines — split if longer
- No console.log in production — use a logger utility
 
## Testing Checkpoints
After each phase, use Browser Agent to verify:
- Phase 1: Google Sign-In, token verification
- Phase 2: Resume CRUD, PDF download with selectable text
- Phase 3: Firestore embeddingsCache field present after save
- Phase 4: /api/analyze returns atsScore and recommendations
- Phase 5: Approve recommendation → resume bullet updated in Firestore
- Phase 6: Extension on LinkedIn → analysis → approve → resume updated