# ResumeIQ 🎯

**ResumeIQ** is an AI-powered resume builder and Chrome Extension designed to help you beat Applicant Tracking Systems (ATS). It extracts job descriptions straight from portals like LinkedIn or Indeed, scores your resume's compatibility, and automatically suggests keyword-optimized rewrites for your experience bullets.

![Landing Page](./docs/assets/landing.png) <!-- Remember to add real screenshots here -->

## Features

- **ATS-Optimized Resume Builder:** Live dual-pane editor that generates completely text-selectable, beautifully-styled PDFs. No `html2canvas` hacks—every PDF is ATS readable.
- **Chrome Extension Tracker:** Operates effortlessly on top of LinkedIn, Naukri, Indeed, and Internshala to grab the current job description.
- **3-Layer AI Analytics:**
  1. **Semantic Similarity:** Computes semantic distance using `text-embedding-004` (embeddings safely cached in Firestore for max speed).
  2. **Quantitative ATS Scoring:** Detailed metrics across Keyword Match, Experience, Skills, and Formats using `gemma-4-31b-it`.
  3. **Generative Recommendations:** Suggests precise, ATS-friendly bullet rewrites without ever losing your truthful context.
- **One-Click Apply:** Accept an AI revision inside your Job Dashboard and it automatically updates the underlying resume document.

---

## Tech Stack Overview

- **Frontend:** React + Vite + TailwindCSS + React Router + Framer Motion.
- **Backend:** Python + FastAPI + Puppeteer (Node.js) + Google GenAI SDK.
- **Database / Auth:** Firebase Auth (Google Sign-in) + Firestore (NoSQL).
- **AI Models:** Gemma 4 (`gemma-4-31b-it`) + Text Embedding 004.
- **Infrastructure:** Fully Dockerized (multi-stage frontend via Nginx, lightweight Python backend).

---

## Getting Started

### Prerequisites
- **Node.js**: v20+ 
- **Python**: v3.11+ (with `venv` support)
- **Docker**: Optional (for containerized deployment)
- **Firebase**: Project with Firestore & Google Auth enabled
- **Google AI Studio**: API Key for Gemma & Embeddings

---

### Quick Start (Local Development)

The easiest way to get everything running is using the root-level orchestration scripts.

1. **Clone the repository** (if you haven't already).
2. **Install all dependencies**:
   ```bash
   # Installs root, frontend, and backend script dependencies
   npm install && npm run install:all
   ```
3. **Setup Environment Variables**:
   - Create `backend/.env` (see `backend/.env.example`)
   - Create `frontend/.env.local` (see `frontend/.env.example`)
4. **Run the full stack**:
   ```bash
   npm run dev
   ```
   - Frontend starts at: `http://localhost:5173`
   - Backend starts at: `http://localhost:8000`

---

### Method 2: Docker Compose (Stateless Mode)

If you prefer Docker, you can spin up the entire stack with a single command. 

```bash
# Ensure .env files are created as per Step 3 above
npm run docker:up
```

---

### Individual Service Setup

If you need to run services separately for debugging:

#### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Using the Chrome Extension

1. **Load the extension**:
   - Open `chrome://extensions/`
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the `/extension` folder.
2. **Sync Auth**: Log in to the Web App at `localhost:5173`. The extension will automatically pick up your safe session token.
3. **Analyze**: Navigate to a job listing (LinkedIn, Indeed, etc.) and click the extension icon to start the analysis.

---

## Architecture & Code Spec

For a deep dive into the reasoning behind our NoSQL modeling, AI pipeline, and Puppeteer PDF generation, see [ARCHITECTURE_AND_RATIONALE.md](./docs/ARCHITECTURE_AND_RATIONALE.md).
