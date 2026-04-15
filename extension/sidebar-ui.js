/**
 * sidebar-ui.js
 * Content script — runs with full chrome API access.
 * Injects a ResumeIQ card inline into the job page DOM.
 * Uses keyword-engine.js functions directly (same content script scope).
 */
'use strict';

let riqState = {
  token: null,
  resumes: [],
  currentResumeId: null,
  jobDetails: null,
  rankings: [],
  panelExpanded: false,
  isAnalyzing: false,
  previousAnalysis: null,
  initialized: false,
};

/**
 * Main entry point — called by content.js after job extraction.
 */
function initResumeIQSidebar(jobDetails) {
  if (riqState.initialized) {
    // Update job details and re-run matching on navigation
    riqState.jobDetails = jobDetails;
    riqState.initialized = false;
    destroyResumeIQSidebar();
  }

  riqState.jobDetails = jobDetails;
  riqState.initialized = true;

  // Check auth first
  chrome.runtime.sendMessage({ action: 'GET_TOKEN' }, (response) => {
    riqState.token = response?.token || null;
    if (!riqState.token) {
      injectCard(renderLoginCard());
      return;
    }
    // Fetch resumes then build UI
    fetchResumesAndBuild();
  });
}

function destroyResumeIQSidebar() {
  document.getElementById('riq-inline-card')?.remove();
  document.getElementById('riq-expanded-panel')?.remove();
  riqState.initialized = false;
  riqState.rankings = [];
  riqState.previousAnalysis = null;
}

function getRiqBackendUrl() {
  const config = globalThis.CONFIG || {};
  const url = config.backendUrl || 'http://localhost:8000';
  // Safety: if somehow a bad value crept in, hard-reset to localhost
  if (!url || url.startsWith('chrome-extension') || url === 'undefined') {
    return 'http://localhost:8000';
  }
  return url.replace(/\/$/, ''); // strip trailing slash
}

// ── Proxy Fetch Helper (Bypass CORS) ──────────────────────────
async function riqFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'PROXY_FETCH', url, options }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!response || response.ok === false) {
        return reject(new Error(response?.error || `Fetch failed (${response?.status || 'unknown'})`));
      }
      // Mocked response object
      resolve({
        ok: response.ok,
        status: response.status,
        json: async () => response.json,
        text: async () => response.text
      });
    });
  });
}

// ── Fetch resumes + run instant match ───────────────────────────
async function fetchResumesAndBuild() {
  try {
    const res = await riqFetch(`${getRiqBackendUrl()}/api/resumes`, {
      headers: { 'Authorization': `Bearer ${riqState.token}` }
    });
    riqState.resumes = await res.json();
  } catch (err) {
    injectCard(renderErrorCard(err.message));
    return;
  }

  // Run instant keyword matching (uses keyword-engine.js functions in scope)
  if (riqState.resumes.length > 0 && riqState.jobDetails?.jdText) {
    riqState.rankings = rankResumesAgainstJD(riqState.jobDetails.jdText, riqState.resumes);
    riqState.currentResumeId = riqState.rankings[0]?.resumeId || null;
  }

  // Inject the inline card
  injectCard(renderMainCard());

  // Background: check for previous AI analysis
  if (riqState.jobDetails?.jdUrl) {
    checkPreviousAnalysis();
  }
}

// ── Find the best LinkedIn DOM injection point ──────────────────
function findInjectionPoint() {
  const host = window.location.hostname;

  if (host.includes('linkedin.com')) {
    // Try multiple selectors — LinkedIn changes their DOM regularly
    const selectors = [
      '.job-details-jobs-unified-top-card__container--two-pane',
      '.job-details-jobs-unified-top-card__top-buttons',
      '.jobs-apply-button--top-card',
      '.jobs-unified-top-card__content--two-pane',
      '.job-view-layout .jobs-details',
      '.jobs-details__main-content',
      '.jobs-search__job-details--container > div:first-child',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return { element: el, position: 'afterend' };
    }
    // Fallback: find the job title h1 and insert after its parent
    const h1 = document.querySelector(
      '.job-details-jobs-unified-top-card__job-title, h1.ember-view'
    );
    if (h1) {
      return { element: h1.closest('div[class*="top-card"]') || h1.parentElement, position: 'afterend' };
    }
  }

  if (host.includes('naukri.com')) {
    const el = document.querySelector('.jd-header-content, .job-header');
    if (el) return { element: el, position: 'afterend' };
  }

  if (host.includes('indeed.com')) {
    const el = document.querySelector('.jobsearch-InfoHeaderContainer, .jobsearch-JobInfoHeader');
    if (el) return { element: el, position: 'afterend' };
  }

  if (host.includes('internshala.com')) {
    const el = document.querySelector('.internship_meta, .internship-details-card');
    if (el) return { element: el, position: 'afterend' };
  }

  return null;
}

function injectCard(html) {
  // Remove any existing card
  document.getElementById('riq-inline-card')?.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'riq-inline-card';
  wrapper.innerHTML = html;

  const target = findInjectionPoint();
  if (target) {
    target.element.insertAdjacentElement(target.position, wrapper);
  } else {
    // Last resort: fixed position badge in bottom-right
    wrapper.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;';
    document.body.appendChild(wrapper);
  }

  // Wire up events after injection
  wireCardEvents();
}

// ── Render: main card ──────────────────────────────────────────
function renderMainCard() {
  const best = riqState.rankings[0];
  const current = riqState.rankings.find(r => r.resumeId === riqState.currentResumeId) || best;
  const score = current?.score || 0;
  const matched = current?.matched?.length || 0;
  const total = current?.totalKeywords || 0;
  const scoreColor = score >= 75 ? '#0a9d76' : score >= 50 ? '#b35900' : '#c0392b';
  const bgColor = score >= 75 ? 'rgba(10,157,118,0.08)' : score >= 50 ? 'rgba(179,89,0,0.08)' : 'rgba(192,57,43,0.08)';
  const borderColor = score >= 75 ? 'rgba(10,157,118,0.2)' : score >= 50 ? 'rgba(179,89,0,0.2)' : 'rgba(192,57,43,0.2)';

  // SVG ring
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return `
    <div class="riq-card">
      <!-- Collapsed row: always visible -->
      <div class="riq-card-row" id="riq-toggle-row" style="cursor:pointer;">
        <!-- Score ring -->
        <div class="riq-ring-wrap" style="color:${scoreColor}">
          <svg width="56" height="56" viewBox="0 0 56 56" style="transform:rotate(-90deg)">
            <circle cx="28" cy="28" r="${r}" fill="none" stroke="#e8e8e8" stroke-width="5"/>
            <circle cx="28" cy="28" r="${r}" fill="none" stroke="${scoreColor}" stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="${circ.toFixed(1)}"
              stroke-dashoffset="${offset.toFixed(1)}"/>
          </svg>
          <span class="riq-ring-label" style="color:${scoreColor}">${score}%</span>
        </div>
        <!-- Text summary -->
        <div class="riq-card-text">
          <div class="riq-card-title">Resume Match
            <span class="riq-card-version-badge">AI</span>
          </div>
          <div class="riq-card-sub" style="color:${scoreColor}">
            <strong>${matched} of ${total} keywords</strong> are present in your resume
          </div>
          ${riqState.resumes.length > 1 ? `
          <div class="riq-card-resume-name">
            📄 ${riqEscape(current?.resumeTitle || 'Untitled')}
            <span class="riq-card-switch-link" id="riq-open-panel">Switch ▾</span>
          </div>` : ''}
        </div>
        <!-- Expand button -->
        <button class="riq-expand-btn" id="riq-expand-btn" title="View details">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" id="riq-expand-chevron" style="transition:transform 0.2s">
            <path d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      <!-- Expanded panel: hidden by default -->
      <div id="riq-detail-panel" class="riq-detail-panel riq-panel-hidden">
        
        <!-- Resume ranking (if multiple) -->
        ${riqState.rankings.length > 1 ? `
        <div class="riq-panel-section">
          <div class="riq-panel-label">YOUR RESUMES — RANKED</div>
          ${riqState.rankings.map((rank, i) => {
            const rc = rank.score >= 75 ? '#0a9d76' : rank.score >= 50 ? '#b35900' : '#c0392b';
            const isActive = rank.resumeId === riqState.currentResumeId;
            return `<div class="riq-resume-row ${isActive ? 'riq-resume-active' : ''}" 
                         data-resume-id="${rank.resumeId}">
              <span class="riq-resume-rank-num">${i + 1}</span>
              <span class="riq-resume-rank-title">${riqEscape(rank.resumeTitle)}</span>
              <div class="riq-resume-rank-bar-outer">
                <div class="riq-resume-rank-bar-inner" style="width:${rank.score}%;background:${rc}"></div>
              </div>
              <span class="riq-resume-rank-score" style="color:${rc}">${rank.score}%</span>
            </div>`;
          }).join('')}
        </div>
        ` : ''}

        <!-- Matched keywords -->
        ${current?.matched?.length > 0 ? `
        <div class="riq-panel-section">
          <div class="riq-panel-label">
            ✓ MATCHED KEYWORDS
            <span class="riq-kw-badge riq-kw-badge-matched">${current.matched.length}</span>
          </div>
          <div class="riq-pill-wrap">
            ${current.matched.map(k =>
              `<span class="riq-pill riq-pill-matched">✓ ${riqEscape(k.displayTerm || k.term)}</span>`
            ).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Missing keywords -->
        ${current?.missing?.length > 0 ? `
        <div class="riq-panel-section">
          <div class="riq-panel-label">
            ✕ MISSING KEYWORDS
            <span class="riq-kw-badge riq-kw-badge-missing">${current.missing.length}</span>
          </div>
          <div class="riq-pill-wrap">
            ${current.missing.map(k =>
              `<span class="riq-pill riq-pill-missing">✕ ${riqEscape(k.displayTerm || k.term)}</span>`
            ).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Previous analysis result (populated async) -->
        <div id="riq-prev-result"></div>

        <!-- Deep analysis CTA -->
        <div class="riq-panel-section">
          <button class="riq-deep-btn" id="riq-deep-btn">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Deep AI Analysis
          </button>
          <div class="riq-deep-hint">Full semantic scoring · Bullet rewrites · Interview prep</div>
        </div>

        <!-- Dashboard link -->
        <div style="text-align:center;padding:8px 0 4px;">
          <span class="riq-dashboard-link" id="riq-dashboard-link">View Dashboard →</span>
        </div>
      </div>
    </div>
  `;
}

// ── Render: login card ─────────────────────────────────────────
function renderLoginCard() {
  return `
    <div class="riq-card riq-card-login">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="riq-logo-pill">R</div>
        <div>
          <div class="riq-card-title">ResumeIQ</div>
          <div class="riq-card-sub">Log in to see your keyword match score</div>
        </div>
        <button class="riq-login-btn" id="riq-login-btn">Log In</button>
      </div>
    </div>
  `;
}

function renderErrorCard(msg) {
  return `
    <div class="riq-card" style="padding:12px 16px;">
      <div class="riq-logo-pill" style="background:#ef4444;display:inline-flex;margin-bottom:6px;">!</div>
      <div style="font-size:12px;color:#6b7280;">ResumeIQ: ${riqEscape(msg)}</div>
    </div>
  `;
}

// ── Wire events ────────────────────────────────────────────────
function wireCardEvents() {
  // Toggle expand/collapse
  const toggleRow = document.getElementById('riq-toggle-row');
  const expandBtn = document.getElementById('riq-expand-btn');
  const panel = document.getElementById('riq-detail-panel');
  const chevron = document.getElementById('riq-expand-chevron');

  function togglePanel() {
    riqState.panelExpanded = !riqState.panelExpanded;
    if (panel) {
      panel.classList.toggle('riq-panel-hidden', !riqState.panelExpanded);
    }
    if (chevron) {
      chevron.style.transform = riqState.panelExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  toggleRow?.addEventListener('click', (e) => {
    if (!e.target.closest('.riq-card-switch-link') && !e.target.closest('.riq-expand-btn')) return;
  });
  expandBtn?.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
  toggleRow?.addEventListener('click', togglePanel);

  // Deep analysis button
  document.getElementById('riq-deep-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_POPUP' });
  });

  // Dashboard link
  document.getElementById('riq-dashboard-link')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
  });

  // Login button
  document.getElementById('riq-login-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
  });

  // Resume switching
  document.querySelectorAll('.riq-resume-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const resumeId = e.currentTarget.dataset.resumeId;
      if (!resumeId) return;
      riqState.currentResumeId = resumeId;
      injectCard(renderMainCard());
      const newPanel = document.getElementById('riq-detail-panel');
      if (newPanel) newPanel.classList.remove('riq-panel-hidden');
      riqState.panelExpanded = true;
    });
  });
}
// ── Previous analysis check ───────────────────────────────────
async function checkPreviousAnalysis() {
  try {
    const res = await riqFetch(`${getRiqBackendUrl()}/api/jobs/check?url=${encodeURIComponent(riqState.jobDetails.jdUrl)}`, {
      headers: { 'Authorization': `Bearer ${riqState.token}` }
    });
    const data = await res.json();
    if (data.found) {
      riqState.previousAnalysis = data;
      renderPreviousResult(data);
    }
  } catch {}
}

function renderPreviousResult(result) {
  const container = document.getElementById('riq-prev-result');
  if (!container) return;
  const ats = result.atsScore || 0;
  const sem = result.semanticScore;
  const recs = result.recommendations?.filter(r => r.status === 'pending').length || 0;
  const atsColor = ats >= 75 ? '#0a9d76' : ats >= 50 ? '#b35900' : '#c0392b';

  container.innerHTML = `
    <div class="riq-panel-section riq-result-banner">
      <div class="riq-panel-label">⚡ AI ANALYSIS RESULT</div>
      <div style="display:flex;gap:16px;align-items:center;margin-top:8px;">
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:${atsColor};font-family:monospace;">${ats}%</div>
          <div style="font-size:10px;color:#6b7280;">ATS Score</div>
        </div>
        ${sem !== undefined ? `
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:${atsColor};font-family:monospace;">${sem}%</div>
          <div style="font-size:10px;color:#6b7280;">Semantic</div>
        </div>` : ''}
        <div style="flex:1;">
          ${recs > 0 ? `<div style="font-size:12px;color:#374151;">${recs} pending improvements</div>` : ''}
          <div class="riq-view-report-btn" id="riq-view-report">View Full Report →</div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('riq-view-report')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
  });
}

// ── Utilities ─────────────────────────────────────────────────
function showRiqToast(msg, type = 'success') {
  document.getElementById('riq-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'riq-toast';
  toast.className = `riq-toast riq-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 3500);
}

function riqEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
