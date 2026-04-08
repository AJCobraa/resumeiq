# ResumeIQ: Detailed Architecture & Engineering Deep-Dive

This document provides an exhaustive, granular look at how ResumeIQ operates under the hood. It explains the exact flow of data, how the AI models (Gemma 4 and Text-Embedding-004) are integrated, how job descriptions are scanned, how recommendations are generated and applied, and what every major file and function does.

---

## 1. High-Level System Architecture

ResumeIQ consists of three distinct client/server components communicating with a centralized database:

1.  **Web Frontend:** A React (Vite + Tailwind) Single Page Application where users build resumes and view the job application dashboard.
2.  **Chrome Extension (Manifest V3):** Injected into job portals (LinkedIn, Indeed, etc.) to scrape Job Descriptions (JDs) and trigger analysis without leaving the job board.
3.  **FastAPI Backend (Python 3.11):** The core engine handling CRUD operations, AI orchestration, PDF generation (via Puppeteer), and data validation.
4.  **Database (Firebase/Firestore):** A NoSQL document database storing user profiles, resumes, job analyses, and vector embedding caches.

---

## 2. Data Storage Strategy (Firestore)

We use Firestore due to its document-oriented structure which perfectly fits resume schemas (nested arrays of sections, bullets, etc.).

**Data Hierarchy:**
- `users/{uid}` - Root user document (tied to Firebase Auth).
  - `resumes/{resumeId}` - Contains resume metadata and a `sections` array.
  - `jobs/{jobId}` - Contains JD text, ATS scores, recommendations, and JD embedding cache.

**Key Decisions:**
*   **UUID Generation:** IDs (`resumeId`, `jobId`, `sectionId`, `bulletId`) are *always* generated server-side using `uuid.uuid4()`. This prevents client-side collision and ensures consistency.
*   **Single-Document Resumes:** Instead of making "Experience" or "Education" their own sub-collections, they are stored as JSON arrays (`sections`) inside the single `resumeId` document. This allows us to load a user's entire resume in exactly 1 database read operation (highly cost-effective).
*   **Embedding Caches:** Both Resumes and Jobs store their vector embeddings directly inside their Firestore documents (`embeddingsCache` and `jdEmbeddingsCache`). Because our chunks are small and vectors are 768-dimensional, they easily fit within Firestore's 1MB document limit, avoiding the need for a separate vector database like Pinecone.

---

## 3. How JDs are Scanned (The Extension Flow)

1.  **Scraping:** The Chrome Extension injects `content.js` into supported job boards. When a user views a job, the script scrapes the `document.body` to find the job title, company, and raw job description text.
2.  **Triggering:** When the user clicks "Analyze" in the extension popup, it sends an authenticated `POST /api/analyze` request to the FastAPI backend, containing the `jdText`, `jdUrl`, `jobTitle`, and the target `resumeId`.
3.  **Caching Pre-Check:** Before doing any expensive AI work, the backend checks if this exact job description has been analyzed before (using a combination of cleaned URL and an MD5 hash of the text). If it has, it uses the cached database record.

---

## 4. The 3-Layer Analysis Pipeline (`analysis_pipeline.py`)

The core of the application resides in `analyze_resume_vs_jd()`. It executes three distinct layers of analysis:

### Layer 1: Semantic Matching (Vector Embeddings)
*   **What it does:** Calculates the `semanticScore` (0-100) representing the deep conceptual match between the resume and the JD.
*   **How it works:** 
    1. It fetches the JD's embedding vector using `text-embedding-004`. 
    2. It pulls the cached resume embedding chunks from Firestore (these are pre-computed every time the user saves their resume).
    3. It runs a `_cosine_similarity` math function comparing the JD vector against every resume chunk vector.
    4. The highest similarities are averaged out to produce the final `semanticScore`.

### Layer 2: ATS Scoring (Gemma 4)
*   **What it does:** Evaluates formatting, keyword matches, and experience level.
*   **How it works:** 
    1. The resume JSON is flattened into readable plain text via `_resume_to_text()`.
    2. Both the flattened resume and the JD text are passed into a prompt telling Gemma to act as an "expert ATS analyst".
    3. Gemma returns a strictly formatted JSON object containing an `atsScore`, a `breakdown` (keywordMatch, experienceMatch, skillsMatch), `missingKeywords`, and `strongMatches`.

### Layer 3: Recommendation Generation (Gemma 4)
*   **What it does:** Suggests specific, actionable rewrites for exact bullet points on the user's resume.
*   **How it works:**
    1. We feed Gemma the resume text, the JD text, and the `missingKeywords` found in Layer 2.
    2. Gemma returns an array of suggested rewrites.
    3. **Crucial Step:** The backend runs `_find_bullet_ids()` which takes the `currentText` Gemma suggested replacing, searches the original resume JSON, and attaches the precise `sectionId` and `bulletId` to the recommendation. This allows the frontend to apply the rewrite reliably later.

---

## 5. Connecting to Gemma 4 & Data Flow (`gemma_service.py`)

We interface with Google's AI Studio using the `google-genai` SDK. The target model is `gemma-4-31b-it`.

**Input Flow to the Model:**
1.  Python strings (prompts) are constructed dynamically using f-strings, injecting `resume_text` and `jd_text`.
2.  The request is sent asynchronously via `client.models.generate_content()`.
3.  We pass `config={"response_mime_type": "application/json"}` to force the model to output strict JSON schemas (preventing markdown formatting issues).

**Handling Output:**
1.  The response text is parsed using Python's `json.loads()`.
2.  Tokens (input/output counts) and latency are extracted from `response.usage_metadata`.
3.  A background daemon thread (`_fire_log()`) is spawned to record these metrics into the `modelLogs` Firestore collection *without* blocking or slowing down the HTTP response to the user.

---

## 6. How Recommendations are Applied

When a user views the Job Dashboard and clicks "Approve" on a recommended bullet rewrite:

1.  **Frontend:** Sends a `PATCH /api/jobs/{job_id}/recommendation` request containing the `recommendationId` and `action: "approve"`.
2.  **Backend Route:** `update_recommendation()` inside `routers/jobs.py` updates the recommendation's status to "approved" inside the job document.
3.  **Resume Update (Background Task):** The router triggers `_apply_recommendation_to_resume()` in the background.
4.  **Applying the Change:** It looks up the user's resume in Firestore. Using the `sectionId` and `bulletId` stored during the analysis phase, it finds the exact dictionary within the nested JSON array and replaces the old text with the `suggestedText`.
5.  **Re-Embedding:** Because the resume text changed, it automatically fires `embedding_service.update_embeddings_cache()` to re-vectorize the resume so it's ready for the next job analysis.

---

## 7. File & Function Glossary

Below is a detailed breakdown of what every major file and function is responsible for.

### `backend/main.py`
*   **Purpose:** The entry point of the FastAPI server. Configures CORS, initializes Firebase, and mounts the routers.

### `backend/firebase_admin_init.py`
*   **Purpose:** Initializes the connection to Firestore using the service account credential.
*   `verify_token(Depends)`: A dependency injected into almost every route. It reads the `Authorization: Bearer <token>` header, verifies it with Firebase Auth, and returns the `user_id`. If invalid, it blocks the request with a 401 error.

### `backend/routers/resumes.py`
*   **Purpose:** Exposes HTTP endpoints for full Resume CRUD operations.
*   `create_resume()`: Generates a blank resume frame and saves it to DB.
*   `update_meta()`, `update_sections()`, `update_bullet()`: Receives partial UI updates, saves to Firestore, and adds `_refresh_embeddings` as a FastAPI `BackgroundTasks` to keep vectors up-to-date silently.
*   `import_pdf()`: Takes an uploaded PDF file, reads text via `pdfplumber`, and passes it to Gemma to parse into structured JSON.

### `backend/routers/jobs.py`
*   **Purpose:** Exposes HTTP endpoints for Job Analysis and Recommendations.
*   `check_job()`: `GET /api/jobs/check?url=...` allows the extension to query if a job URL was already analyzed, avoiding duplicate work.
*   `update_recommendation()`: Approves/Dismisses Gemma's suggestions and applies text changes directly to the resume via `_apply_recommendation_to_resume()`.

### `backend/routers/analysis.py`
*   **Purpose:** Exposes the single `POST /api/analyze` route. Wraps the `analyze_resume_vs_jd` pipeline and handles HTTP-level error handling.

### `backend/services/analysis_pipeline.py`
*   **Purpose:** The orchestration engine for JD vs Resume comparisons.
*   `_clean_url()`: Strips tracking parameters (`?refId=...`) from job URLs to ensure cache keys are consistent.
*   `_md5()`: Hashes the job description text to detect if the recruiter changed the JD since we last analyzed it.
*   `_resume_to_text()`: Converts a deeply nested resume JSON dictionary into a flat, readable markdown string so Gemma can understand it.
*   `_find_bullet_ids()`: Matches a string of text back to its origin `sectionId` and `bulletId` inside the resume structure.
*   `_check_jd_cache()`: Queries Firestore to see if this `jd_url` was analyzed previously.
*   `analyze_resume_vs_jd()`: The master function executing the 3-Layer pipeline (Semantic -> ATS Score -> Recommendations) detailed in Section 4.

### `backend/services/gemma_service.py`
*   **Purpose:** Handles all physical networking and prompting to Google's Gemma 4 model.
*   `_fire_log()`: A daemon thread that writes token consumption metrics to Firestore asynchronously.
*   `_call_model_json()` / `_call_model_text()`: Base network request wrappers. They include automatic 1-time retries with a 2-second sleep if the Google API rate-limits or fails.
*   `score_ats()`: Prompts Gemma to provide the 0-100 score and categorical breakdowns.
*   `generate_recommendations()`: Prompts Gemma to find weak resume points and suggest keyword-rich replacements.
*   `parse_resume_from_text()`: Takes unstructured OCR text from a PDF upload and forces Gemma to extract standard metadata and section arrays matching the ResumeIQ schema.
*   `rewrite_bullet()`: A standalone utility to rewrite a single bullet point on demand.

### `backend/services/embedding_service.py`
*   **Purpose:** Manages the mathematical vector representations of text.
*   `get_jd_embedding()`: Sends job description text to `text-embedding-004` and returns a 768-float array.
*   `update_embeddings_cache()`: Takes a full resume JSON, chunks it into small text blocks (e.g., individual jobs or skills), fetches vectors for each chunk, and saves the `embeddingsCache` object back into the Firestore resume document.

### `backend/services/resume_service.py`
*   **Purpose:** Abstracts away the exact `db.collection().document().set()` Firestore logic for resume files.
*   `create_resume_from_parsed()`: When Gemma parses a raw PDF, this function loops through the output and ensures every section and every bullet gets a fresh `uuid.uuid4()` before saving it to the database.

### `backend/services/pdf_service.py` & `backend/scripts/pdf_render.js`
*   **Purpose:** Generates ATS-readable PDF files from the web app data.
*   **Why not `html2canvas`?** Common web libraries convert HTML to an image, then put that image inside a PDF. ATS systems cannot read images. We must render real text.
*   `_build_template_html()`: Translates the JSON resume dictionary into a raw, self-contained HTML string with inline CSS styling (acting as the template engine).
*   `export_resume_pdf()`: Writes the generated HTML to a temporary `/tmp/` file on the server.
*   **The Subprocess:** It uses Python's `asyncio.create_subprocess_exec` to spawn a Node.js process, running `pdf_render.js`.
*   `pdf_render.js`: A Puppeteer (Headless Chrome) script that opens the local HTML file, strictly sizes the viewport to A4 dimensions, and prints it to a raw PDF file, ensuring the text remains selectable and ATS-compliant.
