/**
 * pdf_render.js — Puppeteer script invoked by Python subprocess.
 *
 * Usage: node pdf_render.js <input.html> <output.pdf>
 *
 * Generates a text-selectable A4 PDF from an HTML file.
 * NEVER use html2canvas — it produces image PDFs that ATS cannot read.
 *
 * BUG FIX (Section 20.3):
 *  - headless: true (the string 'new' was deprecated in Puppeteer v22+)
 *  - Full stack trace logged to stderr so Python can print it
 *  - path.resolve() used on both args for absolute path safety
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function renderPDF(htmlPath, pdfPath) {
  // Resolve to absolute paths so file:// URL and PDF output are unambiguous
  const absHtmlPath = path.resolve(htmlPath);
  const absPdfPath = path.resolve(pdfPath);

  if (!fs.existsSync(absHtmlPath)) {
    throw new Error(`Input HTML file not found: ${absHtmlPath}`);
  }

  console.error(`[pdf_render] html: ${absHtmlPath}`);
  console.error(`[pdf_render] pdf:  ${absPdfPath}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();

    // Set viewport to A4 pixel dimensions for accurate rendering
    await page.setViewport({ width: 794, height: 5000 });

    // Load the resume HTML
    // Ensure forward slashes and three-slash prefix for reliable local file loading
    let normalizedPath = absHtmlPath.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;
    const fileUrl = `file://${normalizedPath}`;

    console.error(`[pdf_render] loading: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 40000 });

    // Generate A4 PDF with text-selectable content
    await page.pdf({
      path: absPdfPath,
      format: 'A4',
      printBackground: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: false,
    });

    const stat = fs.statSync(absPdfPath);
    console.error(`[pdf_render] success — ${stat.size} bytes`);
  } finally {
    await browser.close();
  }
}

// CLI entry
const [,, htmlPath, pdfPath] = process.argv;

if (!htmlPath || !pdfPath) {
  console.error('Usage: node pdf_render.js <input.html> <output.pdf>');
  process.exit(1);
}

renderPDF(htmlPath, pdfPath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[pdf_render] FATAL ERROR:');
    console.error(err.stack || err.message || String(err));
    process.exit(1);
  });
