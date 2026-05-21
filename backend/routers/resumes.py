"""
Resume CRUD router — all routes require authentication via verify_token.
Data operations use PostgreSQL via AsyncSession.
Embedding cache is recomputed on every resume save (not on every analysis).

PDF Import:
  - POST /api/resumes/import-pdf — accepts UploadFile, extracts text via pdfplumber,
    parses structure via Gemma, saves to PostgreSQL, triggers embedding cache.
"""
import os
import uuid
import asyncio
import tempfile
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from firebase_admin_init import verify_token
from core.database import get_db_session
from core.exceptions import GemmaOverloadError
from models.resume_model import (
    CreateResumeRequest,
    UpdateMetaRequest,
    UpdateBulletRequest,
    UpdateTemplateRequest,
    ExportPDFRequest,
)
from services import resume_service

router = APIRouter(prefix="/api", tags=["resumes"])


# ── Background embedding refresh ────────────────────
async def _refresh_embeddings(uid: str, resume_id: str, resume: dict):
    """Fire-and-forget embedding cache refresh (runs in FastAPI background task on main event loop)."""
    try:
        from services import embedding_service
        await embedding_service.update_embeddings_cache(uid, resume_id, resume)
    except Exception as e:
        print(f"Embedding refresh failed: {e}")  # Background task — never crash the request


@router.get("/resumes")
async def get_resumes(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """List all resumes for authenticated user."""
    return await resume_service.list_resumes(db, uid)


@router.get("/resumes/{resume_id}")
async def get_resume(
    resume_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Get full resume by ID."""
    resume = await resume_service.get_resume(db, uid, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("/resumes", status_code=201)
async def create_resume(
    body: CreateResumeRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new blank resume."""
    return await resume_service.create_resume(db, uid, body.title, body.templateId or "cobra")


@router.patch("/resumes/{resume_id}/meta")
async def update_meta(
    resume_id: str, body: UpdateMetaRequest,
    bg: BackgroundTasks,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Update resume meta fields (partial). Refreshes embedding cache."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await resume_service.update_meta(db, uid, resume_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Resume not found")
    bg.add_task(_refresh_embeddings, uid, resume_id, result)
    return result


@router.patch("/resumes/{resume_id}/sections")
async def update_sections(
    resume_id: str, body: dict,
    bg: BackgroundTasks,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Replace the entire sections array (editor save). Refreshes embedding cache."""
    sections = body.get("sections")
    if sections is None:
        raise HTTPException(status_code=400, detail="Missing 'sections' array")
    result = await resume_service.update_sections(db, uid, resume_id, sections)
    if not result:
        raise HTTPException(status_code=404, detail="Resume not found")
    bg.add_task(_refresh_embeddings, uid, resume_id, result)
    return result


@router.patch("/resumes/{resume_id}/bullet")
async def update_bullet(
    resume_id: str, body: UpdateBulletRequest,
    bg: BackgroundTasks,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Update a single bullet's text. Refreshes embedding cache."""
    result = await resume_service.update_bullet(
        db, uid, resume_id, body.sectionId, body.bulletId, body.text
    )
    if not result:
        raise HTTPException(status_code=404, detail="Resume or bullet not found")
    bg.add_task(_refresh_embeddings, uid, resume_id, result)
    return result


@router.patch("/resumes/{resume_id}/template")
async def update_template(
    resume_id: str, body: UpdateTemplateRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Update template ID."""
    result = await resume_service.update_template(db, uid, resume_id, body.templateId)
    if not result:
        raise HTTPException(status_code=404, detail="Resume not found")
    return result


@router.patch("/resumes/{resume_id}/title")
async def update_title(
    resume_id: str, body: dict,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Update resume title."""
    title = body.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Missing 'title'")
    result = await resume_service.update_resume_title(db, uid, resume_id, title)
    if not result:
        raise HTTPException(status_code=404, detail="Resume not found")
    return result


@router.delete("/resumes/{resume_id}")
async def delete_resume(
    resume_id: str,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a resume. Preserves job analysis history."""
    deleted = await resume_service.delete_resume(db, uid, resume_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"deleted": True}


@router.post("/resumes/import-pdf", status_code=201)
async def import_pdf(
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    templateId: str = Form("cobra"),
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Import a resume from a PDF file.

    Pipeline:
      1. Receive UploadFile (multipart/form-data)
      2. Write to /tmp/ (containers are stateless — no permanent storage)
      3. Extract text via pdfplumber
      4. Parse structure via Gemma 4
      5. Save to PostgreSQL with server-generated UUIDs
      6. Trigger background embedding cache
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Write to temp file
    tmp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.pdf")
    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        with open(tmp_path, "wb") as f:
            f.write(contents)

        # Extract text with pdfplumber
        try:
            import pdfplumber
        except ImportError:
            raise HTTPException(status_code=500, detail="pdfplumber not installed")

        raw_text = ""
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"

        if not raw_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from PDF. Make sure it is not a scanned image."
            )

        # Build a title from the filename
        title = file.filename.replace(".pdf", "").replace("-", " ").replace("_", " ").title()
        if len(title) > 60:
            title = title[:60]

        # Check and deduct coins for PDF parsing AND embedding upfront (Batch)
        from core import budget_guard
        await budget_guard.deduct_coins_batch(db, uid, ["parse_resume_pdf", "embed_resume"])

        # Parse via Gemma
        from services import gemma_service
        parsed = await gemma_service.parse_resume_from_text(raw_text, user_id=uid)

        if not isinstance(parsed, dict) or "meta" not in parsed:
            raise HTTPException(status_code=422, detail="AI failed to parse resume structure from PDF text")

        # Save to PostgreSQL
        resume = await resume_service.create_resume_from_parsed(db, uid, parsed, title=title, template_id=templateId)

        # Trigger embedding cache in background
        bg.add_task(_refresh_embeddings, uid, resume["resumeId"], resume)

        return resume

    except (HTTPException, GemmaOverloadError):
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF import failed: {str(e)}")
    finally:
        # Always clean up temp file
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


@router.post("/resumes/{resume_id}/export-pdf")
async def export_pdf(
    resume_id: str, body: ExportPDFRequest,
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """Export resume as PDF via Puppeteer."""
    try:
        from services import pdf_service
        pdf_bytes = await pdf_service.export_resume_pdf(db, uid, resume_id, body.templateId)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="resume_{resume_id[:8]}.pdf"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (RuntimeError, TimeoutError) as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF export failed: {str(e)}")
