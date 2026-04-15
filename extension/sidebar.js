/**
 * sidebar.js
 * Injected sidebar panel for ResumeIQ.
 * Handles: DOM construction, instant keyword matching, deep analysis CTA.
 * Self-invoking — no imports, no frameworks.
 */

(function () {
  'use strict';

  // Prevent double injection
  if (document.getElementById('resumeiq-sidebar')) return;

  let state = {
    token: null,
    resumes: [],           // all user resumes fetched from API
    currentResumeId: null, // currently selected resume
    jobDetails: null,      // extracted job from content.js
    rankings: [],          // ranked resumes from keyword engine
    isAnalyzing: false,
    analysisResult: null,
    sidebarVisible: false,
  };

  // ─── Build sidebar DOM ──────────────────────────────────────
  function buildSidebar() {
    // Toggle button (always visible on right edge)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'resumeiq-toggle-btn';
    toggleBtn.innerHTML = `
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5">
        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
      </svg>
      <span class="riq-toggle-label">ResumeIQ</span>
    `;
    toggleBtn.addEventListener('click', function () { toggleSidebar(); });
    document.body.appendChild(toggleBtn);

    // Sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'resumeiq-sidebar';
    sidebar.innerHTML = `
      <div class="riq-header">
        <div class="riq-logo">
          <div class="riq-logo-icon">R</div>
          ResumeIQ
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="riq-status-badge" id="riq-status-badge">Checking...</span>
          <button class="riq-close-btn" id="riq-close-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="riq-body" id="riq-body">
        <div class="riq-loading-state" id="riq-initial-loading">
          <div class="riq-spinner" style="margin:0 auto 12px;width:24px;height:24px;border-width:3px;"></div>
          <div>Initializing...</div>
        </div>
      </div>
      <div class="riq-footer">
        <span class="riq-footer-link" id="riq-open-dashboard">Open Dashboard &#8594;</span>
        <span class="riq-footer-link" id="riq-open-popup">Full Popup</span>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Wire events
    document.getElementById('riq-close-btn').addEventListener('click', function () {
      toggleSidebar(false);
    });
    document.getElementById('riq-open-dashboard').addEventListener('click', function () {
      chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
    });
    document.getElementById('riq-open-popup').addEventListener('click', function () {
      showToast('Click the ResumeIQ icon in your browser toolbar');
    });
  }

  function toggleSidebar(forceState) {
    const sidebar = document.getElementById('resumeiq-sidebar');
    const btn = document.getElementById('resumeiq-toggle-btn');
    if (!sidebar) return;

    const shouldShow = forceState !== undefined ? forceState : !state.sidebarVisible;
    state.sidebarVisible = shouldShow;

    if (shouldShow) {
      sidebar.classList.add('riq-visible');
      // Push page content left so nothing is hidden
      document.body.style.marginRight = '360px';
      document.body.style.transition = 'margin-right 0.25s';
      if (btn) btn.style.right = '360px';
    } else {
      sidebar.classList.remove('riq-visible');
      document.body.style.marginRight = '';
      if (btn) btn.style.right = '0';
    }
  }

  // ─── Auth check ──────────────────────────────────────────────
  function checkAuth() {
    chrome.runtime.sendMessage({ action: 'GET_TOKEN' }, function (response) {
      state.token = response && response.token ? response.token : null;
      const badge = document.getElementById('riq-status-badge');

      if (!state.token) {
        if (badge) {
          badge.textContent = 'Not logged in';
          badge.style.background = 'rgba(239,68,68,0.15)';
          badge.style.color = '#ef4444';
          badge.style.borderColor = 'rgba(239,68,68,0.25)';
        }
        renderLoginState();
      } else {
        if (badge) badge.textContent = 'Connected';
        init();
      }
    });
  }

  // ─── Main init: fetch resumes + extract job ──────────────────
  async function init() {
    try {
      // Fetch all resumes (for ranking)
      const resumesRes = await apiCall('/api/resumes');
      state.resumes = resumesRes || [];

      // Get job details set by content.js before injecting sidebar
      state.jobDetails = window.__riqJobDetails;

      if (!state.jobDetails || !state.jobDetails.jdText) {
        renderNoJobState();
        return;
      }

      // Set default resume selection (first resume)
      state.currentResumeId = state.resumes[0] ? state.resumes[0].resumeId : null;

      // Run instant keyword matching (client-side, no backend)
      runInstantMatch();

    } catch (err) {
      renderErrorState(err.message);
    }
  }

  // ─── Instant keyword match (no backend) ────────────────────
  function runInstantMatch() {
    if (!window.ResumeIQKeywordEngine || !state.jobDetails || !state.jobDetails.jdText) return;

    const rankResumesAgainstJD = window.ResumeIQKeywordEngine.rankResumesAgainstJD;

    // Rank all resumes
    state.rankings = rankResumesAgainstJD(state.jobDetails.jdText, state.resumes);

    // Set best match as selected if none chosen yet
    if (state.rankings.length > 0 && !state.currentResumeId) {
      state.currentResumeId = state.rankings[0].resumeId;
    }

    renderMainUI();

    // Also check if this job was previously analyzed
    if (state.jobDetails.jdUrl) {
      checkPreviousAnalysis();
    }
  }

  // ─── Check if previously analyzed ────────────────────────────
  async function checkPreviousAnalysis() {
    try {
      const result = await apiCall('/api/jobs/check?url=' + encodeURIComponent(state.jobDetails.jdUrl));
      if (result && result.found) {
        state.analysisResult = result;
        updateAnalysisResultBanner(result);
      }
    } catch (e) {
      // Silent fail — pre-check is optional
    }
  }

  // ─── Render: main UI ─────────────────────────────────────────
  function renderMainUI() {
    const body = document.getElementById('riq-body');
    if (!body) return;

    const currentRanking = state.rankings.find(function (r) { return r.resumeId === state.currentResumeId; }) || state.rankings[0];
    const bestMatch = state.rankings[0];
    const isBestSelected = currentRanking && bestMatch && currentRanking.resumeId === bestMatch.resumeId;
    const score = (currentRanking && currentRanking.score) ? currentRanking.score : 0;
    const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const badgeClass = score >= 75 ? 'riq-badge-excellent' : score >= 50 ? 'riq-badge-good' : 'riq-badge-low';
    const badgeLabel = score >= 75 ? '&#10003; Excellent Match' : score >= 50 ? '~ Good Match' : '&#10007; Low Match';

    // SVG ring math
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let html = '';

    // Job info card
    html += '<div class="riq-job-card">';
    html += '<div class="riq-job-title">' + escapeHtml(state.jobDetails.jobTitle || 'Unknown Position') + '</div>';
    html += '<div class="riq-job-company">' + escapeHtml(state.jobDetails.company || '') + '</div>';
    html += '</div>';

    // Best match suggestion (if different from selected)
    if (!isBestSelected && bestMatch) {
      html += '<div class="riq-best-match-banner">';
      html += '<div class="riq-best-match-icon">&#128161;</div>';
      html += '<div class="riq-best-match-text">';
      html += '<div class="riq-best-match-title">"' + escapeHtml(bestMatch.resumeTitle) + '" is a better match</div>';
      html += '<div class="riq-best-match-sub">' + bestMatch.score + '% keyword match vs ' + score + '%</div>';
      html += '<button class="riq-switch-btn" data-riq-switch="' + escapeHtml(bestMatch.resumeId) + '">Switch to this resume (' + bestMatch.score + '%)</button>';
      html += '</div></div>';
    }

    // Score ring
    html += '<div class="riq-score-section">';
    html += '<div class="riq-score-ring-wrap">';
    html += '<svg width="88" height="88" viewBox="0 0 88 88">';
    html += '<circle cx="44" cy="44" r="' + radius + '" fill="none" stroke="#1e2130" stroke-width="8"/>';
    html += '<circle cx="44" cy="44" r="' + radius + '" fill="none" stroke="' + scoreColor + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" style="transition:stroke-dashoffset 0.8s ease"/>';
    html += '</svg>';
    html += '<div class="riq-score-ring-val" style="color:' + scoreColor + '">' + score + '%</div>';
    html += '</div>';
    html += '<div class="riq-score-details">';
    html += '<div class="riq-score-label">Keyword Match</div>';
    html += '<div class="riq-score-sublabel">';
    html += ((currentRanking && currentRanking.matched) ? currentRanking.matched.length : 0) + ' of ' + ((currentRanking && currentRanking.totalKeywords) ? currentRanking.totalKeywords : 0) + ' keywords found in resume';
    html += '</div>';
    html += '<div class="riq-score-badge ' + badgeClass + '">' + badgeLabel + '</div>';
    html += '</div></div>';

    // All resumes ranking (if more than 1)
    if (state.rankings.length > 1) {
      html += '<div class="riq-kw-section">';
      html += '<div class="riq-kw-header">';
      html += '<span class="riq-kw-title"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Your Resumes</span>';
      html += '<span style="font-size:10px;color:#6b7280;">' + state.rankings.length + ' resumes</span>';
      html += '</div>';
      state.rankings.forEach(function (r, i) {
        const barColor = r.score >= 75 ? '#10b981' : r.score >= 50 ? '#f59e0b' : '#ef4444';
        const isActive = r.resumeId === state.currentResumeId;
        html += '<div class="riq-resume-rank-item ' + (isActive ? 'riq-active' : '') + '" data-riq-switch="' + escapeHtml(r.resumeId) + '">';
        html += '<span class="riq-rank-num">' + (i + 1) + '</span>';
        html += '<span class="riq-rank-name">' + escapeHtml(r.resumeTitle) + '</span>';
        html += '<div class="riq-rank-bar-wrap"><div class="riq-rank-bar" style="width:' + r.score + '%;background:' + barColor + '"></div></div>';
        html += '<span class="riq-rank-score" style="color:' + barColor + '">' + r.score + '%</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Matched keywords
    if (currentRanking && currentRanking.matched && currentRanking.matched.length > 0) {
      html += '<div class="riq-kw-section">';
      html += '<div class="riq-kw-header"><span class="riq-kw-title">&#10003; Matched Keywords</span><span class="riq-kw-count riq-kw-count-matched">' + currentRanking.matched.length + '</span></div>';
      html += '<div class="riq-kw-pills">';
      currentRanking.matched.slice(0, 18).forEach(function (k) {
        html += '<span class="riq-pill riq-pill-matched">&#10003; ' + escapeHtml(k.displayTerm || k.term) + '</span>';
      });
      html += '</div></div>';
    }

    // Missing keywords
    if (currentRanking && currentRanking.missing && currentRanking.missing.length > 0) {
      html += '<div class="riq-kw-section">';
      html += '<div class="riq-kw-header"><span class="riq-kw-title">&#10007; Missing Keywords</span><span class="riq-kw-count riq-kw-count-missing">' + currentRanking.missing.length + '</span></div>';
      html += '<div class="riq-kw-pills">';
      currentRanking.missing.slice(0, 18).forEach(function (k) {
        html += '<span class="riq-pill riq-pill-missing">&#10007; ' + escapeHtml(k.displayTerm || k.term) + '</span>';
      });
      html += '</div></div>';
    }

    // Previous analysis result banner placeholder
    html += '<div id="riq-prev-analysis-banner"></div>';

    // Deep analysis CTA
    html += '<button class="riq-analyze-btn" id="riq-deep-analyze-btn">';
    html += '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';
    html += 'Deep AI Analysis</button>';
    html += '<div style="text-align:center;font-size:11px;color:#4b5563;margin-bottom:16px;">Full semantic scoring &middot; AI recommendations &middot; Interview prep</div>';

    body.innerHTML = html;

    // Wire switch resume buttons (use event-delegation-safe data attributes)
    body.querySelectorAll('[data-riq-switch]').forEach(function (el) {
      el.addEventListener('click', function () {
        const resumeId = el.getAttribute('data-riq-switch');
        if (resumeId) {
          state.currentResumeId = resumeId;
          renderMainUI();
        }
      });
    });

    // Wire deep analyze button
    const deepBtn = document.getElementById('riq-deep-analyze-btn');
    if (deepBtn) {
      deepBtn.addEventListener('click', function () { deepAnalyze(); });
    }

    // Re-populate previous analysis banner if we already have a result
    if (state.analysisResult) {
      updateAnalysisResultBanner(state.analysisResult);
    }
  }

  // ─── Deep AI Analysis ────────────────────────────────────────
  async function deepAnalyze() {
    if (state.isAnalyzing) return;
    const btn = document.getElementById('riq-deep-analyze-btn');
    if (!btn) return;

    state.isAnalyzing = true;
    btn.disabled = true;
    btn.innerHTML = '<div class="riq-spinner"></div> Analyzing... (this takes ~10s)';

    try {
      const result = await apiCall('/api/analyze', 'POST', {
        resumeId: state.currentResumeId,
        jdText: state.jobDetails.jdText,
        jdUrl: state.jobDetails.jdUrl || '',
        jobTitle: state.jobDetails.jobTitle || '',
        company: state.jobDetails.company || '',
        portal: state.jobDetails.portal || 'other',
      });

      state.analysisResult = result;
      updateAnalysisResultBanner(result);
      showToast('Analysis complete! ATS Score: ' + result.atsScore + '%');

    } catch (err) {
      showToast('Analysis failed: ' + err.message, 'error');
    } finally {
      state.isAnalyzing = false;
      const btn2 = document.getElementById('riq-deep-analyze-btn');
      if (btn2) {
        btn2.disabled = false;
        btn2.innerHTML = '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Re-run Deep Analysis';
        btn2.addEventListener('click', function () { deepAnalyze(); });
      }
    }
  }

  function updateAnalysisResultBanner(result) {
    const banner = document.getElementById('riq-prev-analysis-banner');
    if (!banner) return;
    const atsScore = result.atsScore || 0;
    const scoreColor = atsScore >= 75 ? '#10b981' : atsScore >= 50 ? '#f59e0b' : '#ef4444';
    const heading = (result.cached !== undefined) ? '&#9889; AI Analysis Result' : '&#128202; Previous Analysis';
    const pendingCount = (result.recommendations || []).filter(function (r) { return r.status === 'pending'; }).length;

    banner.innerHTML =
      '<div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px 14px;margin-bottom:14px;">' +
        '<div style="font-size:11px;font-weight:700;color:#8b9cf4;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">' + heading + '</div>' +
        '<div style="display:flex;gap:12px;align-items:center;">' +
          '<div style="text-align:center;flex-shrink:0;">' +
            '<div style="font-size:26px;font-weight:800;color:' + scoreColor + ';font-family:monospace;">' + atsScore + '%</div>' +
            '<div style="font-size:10px;color:#6b7280;">ATS Score</div>' +
          '</div>' +
          '<div style="flex:1;">' +
            (result.semanticScore !== undefined ? '<div style="font-size:12px;color:#c9d1d9;margin-bottom:4px;">Semantic: <strong style="color:' + scoreColor + '">' + result.semanticScore + '%</strong></div>' : '') +
            (result.recommendations && result.recommendations.length ? '<div style="font-size:12px;color:#c9d1d9;">' + pendingCount + ' pending improvements</div>' : '') +
          '</div>' +
        '</div>' +
        '<button id="riq-view-report-btn" style="width:100%;margin-top:10px;padding:8px;background:#1e2130;border:1px solid rgba(99,102,241,0.3);border-radius:6px;color:#8b9cf4;font-size:12px;font-weight:600;cursor:pointer;">View Full Report in Dashboard &#8594;</button>' +
      '</div>';

    const reportBtn = document.getElementById('riq-view-report-btn');
    if (reportBtn) {
      reportBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
      });
    }
  }

  // ─── Render states ────────────────────────────────────────────
  function renderLoginState() {
    const body = document.getElementById('riq-body');
    if (!body) return;
    body.innerHTML =
      '<div class="riq-login-state">' +
        '<div style="font-size:32px;margin-bottom:12px;">&#128272;</div>' +
        '<p>Log in to ResumeIQ to see your keyword match score and AI analysis.</p>' +
        '<button class="riq-login-btn" id="riq-login-open-btn">Open ResumeIQ</button>' +
      '</div>';
    const loginBtn = document.getElementById('riq-login-open-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', function () {
        const url = (window.__riqConfig && window.__riqConfig.frontendUrl) ? window.__riqConfig.frontendUrl : 'http://localhost:5173';
        chrome.tabs.create({ url: url });
      });
    }
  }

  function renderNoJobState() {
    const body = document.getElementById('riq-body');
    if (!body) return;
    body.innerHTML =
      '<div style="padding:20px;text-align:center;">' +
        '<div style="font-size:32px;margin-bottom:12px;">&#128269;</div>' +
        '<p style="color:#8892b0;font-size:13px;line-height:1.5;">Open a job listing on LinkedIn, Naukri, Indeed, or Internshala to see your match score.</p>' +
      '</div>';
  }

  function renderErrorState(msg) {
    const body = document.getElementById('riq-body');
    if (!body) return;
    body.innerHTML = '<div style="padding:20px;text-align:center;color:#ef4444;font-size:12px;">Error: ' + escapeHtml(msg) + '</div>';
  }

  // ─── API helper ────────────────────────────────────────────
  async function apiCall(path, method, body) {
    method = method || 'GET';
    const CONFIG = window.__riqConfig || { backendUrl: 'http://localhost:8000' };
    const opts = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + state.token,
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(CONFIG.backendUrl + path, opts);
    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try { detail = JSON.parse(text).detail || text; } catch (e) { /* keep raw text */ }
      throw new Error(detail || 'HTTP ' + res.status);
    }
    return res.json();
  }

  // ─── Toast ────────────────────────────────────────────────
  function showToast(msg, type) {
    type = type || 'success';
    const toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:' + (type === 'error' ? '#ef4444' : '#10b981') + ';' +
      'color:white;padding:10px 20px;border-radius:8px;' +
      'font-size:13px;font-weight:600;z-index:2147483648;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.3);' +
      'animation:riq-fadein 0.2s ease;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Bootstrap ────────────────────────────────────────────
  buildSidebar();
  checkAuth();

  // Auto-show sidebar on job pages after a short settle delay
  setTimeout(function () {
    if (!state.sidebarVisible) {
      toggleSidebar(true);
    }
  }, 800);

})();
