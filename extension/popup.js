document.addEventListener('DOMContentLoaded', async () => {
  const UI = {
    stateLogin: document.getElementById('state-login'),
    stateNoJob: document.getElementById('state-no-job'),
    stateJob: document.getElementById('state-job'),
    stateAnalyzing: document.getElementById('state-analyzing'),
    stateResults: document.getElementById('state-results'),
    
    statusBadge: document.getElementById('user-status'),
    btnLogin: document.getElementById('btn-login'),
    btnAnalyze: document.getElementById('btn-analyze'),
    btnDashboard: document.getElementById('btn-dashboard'),
    btnReset: document.getElementById('btn-reset'),
    btnForceRetry: document.getElementById('btn-force-retry'),
    btnCleanJd: document.getElementById('btn-clean-jd'),
    
    jobTitle: document.getElementById('job-title'),
    jobCompany: document.getElementById('job-company'),
    jdText: document.getElementById('jd-text'),
    jdMeta: document.getElementById('jd-meta'),
    resumeSelect: document.getElementById('resume-select'),
    errorMsg: document.getElementById('error-msg'),
    
    scoreVal: document.getElementById('result-score-val'),
    recoCount: document.getElementById('result-reco-count')
  };

  let token = null;
  let jobDetails = null;
  let resumes = [];

  // Extra UI refs for cached state
  UI.cachedNotice = document.getElementById('cached-notice');
  UI.cachedScore = document.getElementById('cached-score');
  UI.btnViewCached = document.getElementById('btn-view-cached');
  UI.btnReanalyze = document.getElementById('btn-reanalyze');

  function showState(stateEl) {
    [UI.stateLogin, UI.stateNoJob, UI.stateJob, UI.stateAnalyzing, UI.stateResults].forEach(el => el.classList.add('hidden'));
    stateEl.classList.remove('hidden');
  }

  function updateJdMeta() {
    const text = (UI.jdText?.value || '').trim();
    if (UI.jdMeta) {
      UI.jdMeta.textContent = `${text.length} characters`;
    }
  }

  function autoCleanJdText(rawText, selectedTitle = '') {
    let cleaned = (rawText || '').trim();
    if (!cleaned) return '';

    const tailPatterns = [
      /Get job alerts for this search[\s\S]*$/i,
      /Are these results helpful\?[\s\S]*$/i,
      /About Accessibility Help Center Privacy[\s\S]*$/i,
      /LinkedIn Corporation © \d{4}[\s\S]*$/i,
      /Reactivate Premium[\s\S]*$/i,
      /Job search faster with Premium[\s\S]*$/i,
      /Interested in working with us in the future\?[\s\S]*$/i,
    ];

    for (const pattern of tailPatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }

    const anchors = ['About the job', 'What Do We Do', 'Key Responsibilities', 'Requirements', 'Tech Stack'];
    let anchorIndex = -1;
    for (const anchor of anchors) {
      const idx = cleaned.toLowerCase().indexOf(anchor.toLowerCase());
      if (idx !== -1 && (anchorIndex === -1 || idx < anchorIndex)) {
        anchorIndex = idx;
      }
    }
    if (anchorIndex > 0) {
      cleaned = cleaned.slice(anchorIndex).trim();
    }

    const title = (selectedTitle || '').trim();
    if (title) {
      const titleIdx = cleaned.toLowerCase().indexOf(title.toLowerCase());
      if (titleIdx > 0) {
        const before = cleaned.slice(0, titleIdx);
        if (/99\+\s+results|promoted jobs are ranked|Viewed · Posted on|Easy Apply/i.test(before)) {
          cleaned = cleaned.slice(titleIdx).trim();
        }
      }
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  // 1. Get Token from Background
  chrome.runtime.sendMessage({ action: 'GET_TOKEN' }, async (response) => {
    token = response?.token;
    if (!token) {
      UI.statusBadge.textContent = 'Not Logged In';
      showState(UI.stateLogin);
    } else {
      UI.statusBadge.textContent = 'Connected';
      UI.statusBadge.classList.add('connected');
      await initializeApp();

      // Show sidebar status in popup header
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => !!document.getElementById('resumeiq-sidebar'),
          }).then(results => {
            const sidebarActive = results?.[0]?.result;
            if (sidebarActive) {
              const badge = document.getElementById('user-status');
              if (badge) {
                badge.textContent = 'Sidebar Active';
                badge.style.background = 'rgba(99,102,241,0.2)';
                badge.style.color = '#818cf8';
              }
            }
          }).catch(() => {});
        }
      });
    }
  });

  UI.btnLogin.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });

  async function initializeApp() {
    // Check if we are on a valid job page
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;
      const tabId = tabs[0].id;
      
      chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_JOB' }, async (response) => {
        if (chrome.runtime.lastError) {
          console.log("Content script not active on this tab.");
          showState(UI.stateNoJob);
          return;
        }
        if (!response || !response.success) {
          showState(UI.stateNoJob);
        } else {
          jobDetails = response.data;
          UI.jobTitle.value = jobDetails.jobTitle || 'Unknown Position';
          UI.jobCompany.value = jobDetails.company || 'Unknown Company';
          UI.jdText.value = jobDetails.jdText || '';
          updateJdMeta();
          showState(UI.stateJob);
          await fetchResumes();
          // Pre-check if this URL was already analyzed
          if (jobDetails.jdUrl) {
            await checkPreviousAnalysis(jobDetails.jdUrl);
          }
        }
      });
    });
  }

  UI.jdText?.addEventListener('input', updateJdMeta);
  UI.btnCleanJd?.addEventListener('click', () => {
    const source = UI.jdText?.value || '';
    const cleaned = autoCleanJdText(source, UI.jobTitle?.value || '');
    UI.jdText.value = cleaned;
    updateJdMeta();
  });

  async function checkPreviousAnalysis(url) {
    try {
      const res = await fetch(`${CONFIG.backendUrl}/api/jobs/check?url=${encodeURIComponent(url)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.found) {
        UI.cachedScore.textContent = `${data.atsScore}%`;
        UI.cachedNotice.classList.remove('hidden');
        // Wire buttons
        UI.btnViewCached.onclick = () => chrome.tabs.create({ url: `${CONFIG.frontendUrl || 'http://localhost:5173'}/dashboard` });
        UI.btnReanalyze.onclick = () => {
          UI.cachedNotice.classList.add('hidden');
          UI.btnAnalyze.click();
        };
      }
    } catch (e) {
      // Silent fail — pre-check is optional
    }
  }

  async function fetchResumes() {
    try {
      const res = await fetch(`${CONFIG.backendUrl}/api/resumes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Auth failed');
      resumes = await res.json();
      
      UI.resumeSelect.innerHTML = '';
      if (resumes.length === 0) {
        UI.resumeSelect.innerHTML = '<option disabled selected>No resumes found. Create one first.</option>';
        UI.btnAnalyze.disabled = true;
      } else {
        resumes.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.resumeId;
          opt.textContent = `${r.meta?.title || 'Untitled'} (${r.meta?.name || 'No Name'})`;
          UI.resumeSelect.appendChild(opt);
        });
        UI.btnAnalyze.disabled = false;
      }
    } catch (e) {
      UI.statusBadge.textContent = 'Auth Expired';
      UI.statusBadge.classList.remove('connected');
      showState(UI.stateLogin);
    }
  }

  UI.btnAnalyze.addEventListener('click', async () => {
    const resumeId = UI.resumeSelect.value;
    if (!resumeId || !jobDetails) return;
    const jdText = (UI.jdText.value || '').trim();
    if (!jdText) {
      showState(UI.stateJob);
      UI.errorMsg.textContent = 'Could not extract job description text. Open the full job details panel and retry.';
      UI.errorMsg.classList.remove('hidden');
      return;
    }

    showState(UI.stateAnalyzing);
    UI.errorMsg.classList.add('hidden');

    try {
      const response = await fetch(`${CONFIG.backendUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId,
          jdText,
          jdUrl: jobDetails.jdUrl,
          jobTitle: UI.jobTitle.value,
          company: UI.jobCompany.value,
          portal: jobDetails.portal
        })
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          detail = data?.detail || JSON.stringify(data);
        } catch {
          detail = await response.text();
        }
        throw new Error(detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Update UI
      UI.scoreVal.textContent = `${result.atsScore}%`;
      if (result.atsScore >= 75) {
        UI.scoreVal.style.color = 'var(--color-green)';
      } else if (result.atsScore >= 50) {
        UI.scoreVal.style.color = 'var(--color-orange)';
      } else {
        UI.scoreVal.style.color = 'var(--color-red)';
      }
      
      UI.recoCount.textContent = `Found ${result.recommendations?.length || 0} recommendations to improve.`;
      
      showState(UI.stateResults);
    } catch (e) {
      console.error('Analyze request failed', e);
      showState(UI.stateJob);
      UI.errorMsg.textContent = `Analysis failed: ${e.message || 'Unknown error'}`;
      UI.errorMsg.classList.remove('hidden');
    }
  });

  UI.btnDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
  });

  UI.btnReset.addEventListener('click', () => {
    showState(UI.stateJob);
  });

  UI.btnForceRetry?.addEventListener('click', () => {
    UI.btnForceRetry.textContent = "Retrying...";
    initializeApp();
  });
});
