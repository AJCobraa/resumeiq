"""
PDF export service — uses Puppeteer (Node.js subprocess) to generate
text-selectable PDFs from the resume template HTML.

NEVER use html2canvas — it produces image-based PDFs that ATS cannot read.

BUG FIX (Section 20.3):
  - Uses shutil.which("node") to find the absolute node path dynamically,
    since the PATH inside a uvicorn subprocess may not include the user's Node install.
  - Captures and prints stderr from the Puppeteer subprocess for debugging.
  - HTML builder now groups experience entries under a SINGLE "Experience" header
    (matching the CobraTemplate grouping fix in Bug 1).
"""
import os
import json
import shutil
import asyncio
import tempfile
import uuid
from pathlib import Path
from itertools import groupby

from services import resume_service

# --- Absolute path to the Puppeteer runner script -------------------------
# Use os.path.abspath to guarantee this works regardless of CWD.
SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts"))
PUPPETEER_SCRIPT = os.path.join(SCRIPTS_DIR, "pdf_render.js")


def _find_node() -> str:
    """
    Find the absolute path to the node executable.
    Checks common Windows locations as fallback if shutil.which fails.
    """
    # 1. Try shutil.which (respects PATH)
    node = shutil.which("node")
    if node:
        return node

    # 2. Common Windows fallbacks
    candidates = [
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
        os.path.expanduser(r"~\AppData\Roaming\nvm\current\node.exe"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c

    raise RuntimeError(
        "node executable not found. Install Node.js and make sure it is on your PATH."
    )


async def export_resume_pdf(user_id: str, resume_id: str, template_id: str = "cobra") -> bytes:
    """
    Export a resume as a text-selectable PDF.

    Flow:
      1. Load resume from Firestore
      2. Build full self-contained HTML using inline CSS
      3. Write HTML to a temp file (in /tmp — containers are stateless)
      4. Invoke Puppeteer via: node <absolute/path/to/pdf_render.js> <html> <pdf>
      5. Print stderr to console if exit code is non-zero
      6. Read and return PDF bytes
    """
    # 1 — Load resume
    resume = await resume_service.get_resume(user_id, resume_id)
    if not resume:
        raise ValueError("Resume not found")

    # 2 — Build HTML
    html = _build_template_html(resume, template_id)

    # 3 — Write HTML to unique temp paths
    tmp_dir = tempfile.mkdtemp()
    uid_hex = uuid.uuid4().hex
    html_path = os.path.abspath(os.path.join(tmp_dir, f"{uid_hex}.html"))
    pdf_path = os.path.abspath(os.path.join(tmp_dir, f"{uid_hex}.pdf"))

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    # Find node
    try:
        node_bin = _find_node()
    except RuntimeError as e:
        raise RuntimeError(str(e))

    print(f"[pdf_service] node={node_bin}")
    print(f"[pdf_service] script={PUPPETEER_SCRIPT}")
    print(f"[pdf_service] html={html_path}")
    print(f"[pdf_service] pdf={pdf_path}")

    try:
        # 4 — Invoke Puppeteer with absolute paths
        proc = await asyncio.create_subprocess_exec(
            node_bin,
            PUPPETEER_SCRIPT,
            html_path,
            pdf_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=SCRIPTS_DIR,  # CWD = scripts dir so require('puppeteer') resolves correctly
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=45)

        # 5 — Print stderr always (useful for debugging)
        if stdout:
            print(f"[pdf_service stdout] {stdout.decode()}")
        if stderr:
            print(f"[pdf_service stderr] {stderr.decode()}")

        if proc.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown Puppeteer error"
            raise RuntimeError(f"Puppeteer PDF render failed (exit {proc.returncode}): {error_msg}")

        # 6 — Read PDF bytes
        if not os.path.exists(pdf_path):
            raise RuntimeError("Puppeteer reported success but PDF file was not created")

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        if len(pdf_bytes) == 0:
            raise RuntimeError("PDF file was created but is empty")

        return pdf_bytes

    finally:
        # Cleanup temp files — containers are stateless
        for p in [html_path, pdf_path]:
            try:
                if os.path.exists(p):
                    os.unlink(p)
            except Exception:
                pass
        try:
            if os.path.exists(tmp_dir):
                os.rmdir(tmp_dir)
        except Exception:
            pass


def _build_template_html(resume: dict, template_id: str) -> str:
    """
    Build a self-contained HTML page from resume data for PDF rendering.

    BUG FIX (Section 20.1 mirror): Groups experience sections so the
    "Experience" header is emitted once, then all job entries follow.
    Same grouping applied to Skills, Projects, and Education.
    """
    meta = resume.get("meta", {})
    sections = sorted(resume.get("sections", []), key=lambda s: s.get("order", 0))

    # Group consecutive sections of same type
    grouped_html = ""
    for stype, group in groupby(sections, key=lambda s: s.get("type", "")):
        items = list(group)
        if stype == "experience":
            grouped_html += _render_experience_group(items)
        elif stype == "education":
            grouped_html += _render_education_group(items)
        elif stype == "skills":
            grouped_html += _render_skills_group(items)
        elif stype == "projects":
            grouped_html += _render_projects_group(items)

    contact_items = [
        meta.get("email"),
        meta.get("phone"),
        meta.get("location"),
        _strip_scheme(meta.get("linkedin", "")),
        _strip_scheme(meta.get("github", "")),
    ]
    contact_items = [c for c in contact_items if c]
    contact_html = "  •  ".join(contact_items) if contact_items else ""

    summary_html = ""
    if meta.get("summary"):
        summary_html = f"""
        <div class="section-title">Professional Summary</div>
        <p class="summary">{meta['summary']}</p>
        """

    name_html = f"<h1>{meta.get('name', '')}</h1>" if meta.get("name") else ""
    title_html = f"<p class='title'>{meta.get('title', '')}</p>" if meta.get("title") else ""
    contact_block = f"<p class='contact'>{contact_html}</p>" if contact_html else ""

    # ATS-safe fonts only — per AGENTS.md
    font = "'Arial', 'Helvetica', sans-serif"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: {font};
      color: #1a1a1a;
      font-size: 10pt;
      line-height: 1.4;
      padding: 40px 48px;
    }}
    .header {{ text-align: center; margin-bottom: 20px; }}
    .header h1 {{ font-size: 22pt; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }}
    .header .title {{ font-size: 11pt; color: #555; margin-bottom: 8px; }}
    .header .contact {{ font-size: 9pt; color: #777; }}
    .section-title {{
      font-size: 11pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; border-bottom: 1.5px solid #1a1a1a;
      padding-bottom: 2px; margin: 14px 0 8px;
    }}
    .summary {{ color: #555; font-size: 9.5pt; line-height: 1.5; margin: 4px 0 12px; }}
    .entry {{ margin-bottom: 10px; }}
    .entry-header {{ display: flex; justify-content: space-between; align-items: baseline; }}
    .entry-title {{ font-weight: 700; font-size: 10.5pt; }}
    .entry-company {{ color: #555; }}
    .entry-date {{ font-size: 9pt; color: #777; white-space: nowrap; }}
    .entry-location {{ font-size: 9pt; color: #777; margin-top: 1px; }}
    ul {{ margin: 4px 0 0; padding-left: 18px; list-style-type: disc; }}
    li {{ font-size: 9.5pt; color: #555; margin-bottom: 2px; line-height: 1.45; }}
    .skill-line {{ margin: 3px 0; font-size: 9.5pt; }}
    .skill-label {{ font-weight: 700; }}
    .skill-items {{ color: #555; }}
    .tech-stack {{ color: #2563eb; font-size: 9pt; margin-left: 8px; }}
    .grade {{ font-size: 9pt; color: #555; margin-top: 1px; }}
  </style>
</head>
<body>
  <div class="header">
    {name_html}
    {title_html}
    {contact_block}
  </div>
  {summary_html}
  {grouped_html}
</body>
</html>"""


# ── Grouped section renderers ─────────────────────────────────────────────

def _render_experience_group(sections: list) -> str:
    """Render all experience entries under ONE 'Experience' header."""
    filled = [s for s in sections if s.get("company") or s.get("role")]
    if not filled:
        return ""
    html = '<div class="section-title">Experience</div>'
    for s in filled:
        dates = " – ".join(filter(None, [s.get("startDate"), s.get("endDate")]))
        bullets = _render_bullets(s.get("bullets", []))
        location = f"<p class='entry-location'>{s['location']}</p>" if s.get("location") else ""
        company = f" — <span class='entry-company'>{s['company']}</span>" if s.get("company") else ""
        html += f"""
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="entry-title">{s.get('role', '')}</span>
          {company}
        </div>
        <span class="entry-date">{dates}</span>
      </div>
      {location}
      {bullets}
    </div>"""
    return html


def _render_education_group(sections: list) -> str:
    """Render all education items under ONE 'Education' header."""
    all_items = []
    for s in sections:
        all_items.extend([i for i in s.get("items", []) if i.get("degree") or i.get("institution")])
    if not all_items:
        return ""
    html = '<div class="section-title">Education</div>'
    for item in all_items:
        dates = " – ".join(filter(None, [item.get("startYear"), item.get("endYear")]))
        location = f"<p class='entry-location'>{item['location']}</p>" if item.get("location") else ""
        grade = f"<p class='grade'>GPA: {item['grade']}</p>" if item.get("grade") else ""
        inst = f" — <span class='entry-company'>{item['institution']}</span>" if item.get("institution") else ""
        html += f"""
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="entry-title">{item.get('degree', '')}</span>
          {inst}
        </div>
        <span class="entry-date">{dates}</span>
      </div>
      {location}
      {grade}
    </div>"""
    return html


def _render_skills_group(sections: list) -> str:
    """Render all skill categories under ONE 'Skills' header."""
    all_cats = []
    for s in sections:
        all_cats.extend([c for c in s.get("categories", []) if c.get("label") or c.get("items")])
    if not all_cats:
        return ""
    html = '<div class="section-title">Skills</div>'
    for cat in all_cats:
        items_str = ", ".join(cat.get("items", []))
        html += f"""<p class="skill-line"><span class="skill-label">{cat.get('label', '')}:</span> <span class="skill-items">{items_str}</span></p>"""
    return html


def _render_projects_group(sections: list) -> str:
    """Render all project entries under ONE 'Projects' header."""
    all_items = []
    for s in sections:
        all_items.extend([i for i in s.get("items", []) if i.get("name")])
    if not all_items:
        return ""
    html = '<div class="section-title">Projects</div>'
    for item in all_items:
        dates = " – ".join(filter(None, [item.get("startDate"), item.get("endDate")]))
        tech = f"<span class='tech-stack'>[{item['techStack']}]</span>" if item.get("techStack") else ""
        location = f"<p class='entry-location'>{item['institution']}</p>" if item.get("institution") else ""
        bullets = _render_bullets(item.get("bullets", []))
        html += f"""
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="entry-title">{item['name']}</span>
          {tech}
        </div>
        <span class="entry-date">{dates}</span>
      </div>
      {location}
      {bullets}
    </div>"""
    return html


# ── Shared helpers ───────────────────────────────────────────────────────

def _render_bullets(bullets: list) -> str:
    filled = [b for b in bullets if b.get("text")]
    if not filled:
        return ""
    items = "".join(f"<li>{b['text']}</li>" for b in filled)
    return f"<ul>{items}</ul>"


def _strip_scheme(url: str) -> str:
    if not url:
        return ""
    for prefix in ["https://", "http://"]:
        if url.startswith(prefix):
            return url[len(prefix):]
    return url
