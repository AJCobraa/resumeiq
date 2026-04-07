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

## Getting Started Locally

### Prerequisites
- Node.js (v20+)
- Python (v3.11+)
- Firebase Project with Firestore and Google Authentication enabled
- Google AI Studio API Key (`GOOGLE_AI_STUDIO_API_KEY`)

### Method 1: Local Development (Hot-Reload)

**1. Clone & Set up Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Install Node dependencies needed for Puppeteer PDF generator
cd scripts && npm install && cd ..
```

**2. Setup Backend Environment Variables**
Create `backend/.env`:
```ini
GOOGLE_AI_STUDIO_API_KEY=your_key_here
FIREBASE_SERVICE_ACCOUNT={"type": "service_account"...} # Your Firebase Service Account JSON string
FRONTEND_URL=http://localhost:5173
```

**3. Run Backend**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**4. Set up Frontend**
```bash
cd frontend
npm install
```

**5. Setup Frontend Environment Variables**
Create `frontend/.env.local`:
```ini
VITE_BACKEND_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_public_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
```

**6. Run Frontend**
```bash
npm run dev
```

### Method 2: Docker Compose (Full Stack)

```bash
# Needs .env files mapped as mentioned above
docker-compose up --build
```
> Note: The frontend mounts to `http://localhost:5173` while back-end spins up heavily-cached Python logic at `:8000`.

---

## Using the Chrome Extension

1. Go to `chrome://extensions/`
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `/extension` directory in the repository.
4. Log in using the Web App at `localhost:5173`. The authentication token automatically syncs to your extension logic!
5. Surf to a supported Job Portal and hit your Extension Icon.

---

## Architecture & Code Spec

Read the detailed overview of our NoSQL modeling, component choices, and infrastructure reasons inside [`docs/ARCHITECTURE_AND_RATIONALE.md`](./docs/ARCHITECTURE_AND_RATIONALE.md).
