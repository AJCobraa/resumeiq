/**
 * Content Script - Extracts Job Description & Details from supported portals
 * Listens for messages from the popup/background script.
 */

function extractLinkedIn() {
  const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const firstText = (selectors = [], root = document) => {
    for (const selector of selectors) {
      const el = root.querySelector(selector);
      const txt = el?.innerText?.trim();
      if (txt) return txt;
    }
    return '';
  };

  const inferLinkedInJobUrl = () => {
    // Prefer the canonical /jobs/view/{id}/ URL over search URLs.
    const activeItem = document.querySelector(
      '.jobs-search-results__list-item--active, .jobs-search-results-list__list-item--active, li[data-job-id]'
    );
    const activeJobId = activeItem?.getAttribute('data-job-id');
    if (activeJobId) {
      return `https://www.linkedin.com/jobs/view/${activeJobId}/`;
    }

    const directLink = document.querySelector(
      'a[href*="/jobs/view/"], .job-details-jobs-unified-top-card__job-title a'
    );
    const href = directLink?.getAttribute('href') || '';
    const idMatch = href.match(/\/jobs\/view\/(\d+)/);
    if (idMatch?.[1]) {
      return `https://www.linkedin.com/jobs/view/${idMatch[1]}/`;
    }

    const currentMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
    if (currentMatch?.[1]) {
      return `https://www.linkedin.com/jobs/view/${currentMatch[1]}/`;
    }

    return window.location.href;
  };

  const cleanLinkedInJdText = (raw) => {
    const text = (raw || '').trim();
    if (!text) return '';

    // 1. Per-line filtering for known LinkedIn UI noise
    const boilerplatePatterns = [
      /99\+\s+results/i,
      /promoted jobs are ranked/i,
      /Viewed\s+·\s+Posted on/i,
      /Easy Apply/i,
      /Get job alerts for this search/i,
      /Are these results helpful\?/i,
      /About Accessibility Help Center Privacy/i,
      /LinkedIn Corporation © \d{4}/i,
      /Reactivate Premium/i,
      /Job search faster with Premium/i,
      /Interested in working with us in the future\?/i,
      /See who you know at/i,
      /how promoted jobs are ranked/i,
      /results matching your search/i,
      /Save this job/i,
      /Share this job/i,
      /Report this job/i,
      /Show more/i,
      /See more jobs like this/i
    ];

    let lines = text.split('\n');
    let filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true; // Keep empty lines for spacing
      return !boilerplatePatterns.some(pattern => pattern.test(trimmed));
    });

    let cleaned = filteredLines.join('\n').trim();

    // 2. Anchor-based trimming: "About the job" is the gold standard anchor.
    // If we find it, and there's still suspicious noise before it, we slice.
    const anchors = [
      'About the job',
      'Job Description',
      'The Role',
      'Key Responsibilities',
      'Requirements',
      'Tech Stack',
    ];

    let anchorIndex = -1;
    for (const anchor of anchors) {
      const idx = cleaned.toLowerCase().indexOf(anchor.toLowerCase());
      if (idx !== -1 && (anchorIndex === -1 || idx < anchorIndex)) {
        anchorIndex = idx;
      }
    }

    // Only trim if the anchor is relatively early and we suspect noise before it
    if (anchorIndex > 0 && anchorIndex < 1000) {
      const before = cleaned.slice(0, anchorIndex);
      // If the part before anchor contains common noise keywords not caught by per-line (e.g. fragments)
      if (/results|promoted|posted|apply/i.test(before)) {
        cleaned = cleaned.slice(anchorIndex).trim();
      }
    }

    return cleaned;
  };

  const container = document.querySelector('.jobs-search__job-details--wrapper')
    || document.querySelector('.jobs-search__job-details--container')
    || document.querySelector('.job-view-layout')
    || document.querySelector('.jobs-details__main-content')
    || document.querySelector('.scaffold-layout__detail')
    || document.querySelector('.jobs-unified-top-card')
    || document.querySelector('main')
    || document;

  let title = firstText([
    '.job-details-jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title-link',
    '.jobs-unified-top-card__job-title',
    'h1.t-24.t-bold.inline',
    'h1.t-24.t-bold',
    'h1.ember-view',
    '.job-title',
    '.t-24.t-bold',
    'h2.t-24',
    '.jobs-details-top-card__job-title',
    '.jobs-search__job-details--container h1',
    '.jobs-search__job-details--container h2',
    '.jobs-search-results__list-item--active h3',
    '.jobs-search-results-list__list-item--active h3',
    'a[href*="/jobs/view/"] span[aria-hidden="true"]'
  ], container);

  // Fallback to active card title in left rail
  if (!title) {
    title = firstText([
      '.jobs-search-results__list-item--active h3',
      '.jobs-search-results-list__list-item--active h3',
      '.jobs-search-results__list-item--active .job-card-list__title',
      '.jobs-search-results-list__list-item--active .job-card-list__title'
    ]);
  }

  let companyText = firstText([
    '.job-details-jobs-unified-top-card__company-name',
    '.job-details-jobs-unified-top-card__subtitle-primary-grouping a',
    '.job-details-jobs-unified-top-card__primary-description a',
    '.jobs-unified-top-card__company-name',
    '.jobs-search__job-details--container a[href*="/company/"]',
    '.jobs-search-results__list-item--active h4',
    '.jobs-search-results-list__list-item--active h4',
    'a[href*="/company/"]'
  ], container);

  if (!companyText) {
    companyText = firstText([
      '.jobs-search-results__list-item--active h4',
      '.jobs-search-results-list__list-item--active h4'
    ]);
  }

  const descEl = container.querySelector('#job-details') 
    || container.querySelector('.jobs-description-content__text')
    || container.querySelector('.jobs-description__container')
    || container.querySelector('.jobs-description__content')
    || container.querySelector('[data-job-description]')
    || container.querySelector('article')
    || container.querySelector('.job-details-module__content');

  let jdText = '';
  if (descEl) {
    jdText = descEl.innerText.trim();
  } else {
    // Restore robust fallback behavior for LinkedIn layout variants
    const rightPanel = document.querySelector('.jobs-search__job-details--container')
      || document.querySelector('.job-view-layout')
      || document.querySelector('.job-details-module')
      || container;

    if (rightPanel) {
      jdText = rightPanel.innerText.trim();
    } else {
      jdText = document.body.innerText.trim().substring(0, 15000);
    }
  }

  let companyName = companyText || 'Unknown Company';
  // Strip out any hidden screen reader text like "View Company page" that might be inside the link
  companyName = companyName.split('\n')[0].replace(/View company page/gi, '').trim();

  const cleanedTitle = normalize(title);
  let cleanedJd = normalize(cleanLinkedInJdText(jdText));

  // Final sanity check: If search/feed text is still prepended, trim to selected title occurrence.
  if (cleanedTitle) {
    const titleIdx = cleanedJd.toLowerCase().indexOf(cleanedTitle.toLowerCase());
    if (titleIdx > 0 && titleIdx < 800) {
      const before = cleanedJd.slice(0, titleIdx);
      if (/99\+\s+results|promoted jobs are ranked|Viewed · Posted on|Easy Apply|Save/i.test(before)) {
        cleanedJd = cleanedJd.slice(titleIdx).trim();
      }
    }
  }
  const jobUrl = inferLinkedInJobUrl();

  return {
    portal: 'linkedin',
    jobTitle: cleanedTitle || 'Unknown Position',
    company: companyName || 'Unknown Company',
    jdText: cleanedJd,
    jdUrl: jobUrl
  };
}

function extractNaukri() {
  const titleEl = document.querySelector('.job-title') || document.querySelector('h1');
  const companyEl = document.querySelector('.job-details .info .company') || document.querySelector('.company-name');
  const descEl = document.querySelector('.job-desc');

  return {
    portal: 'naukri',
    jobTitle: titleEl ? titleEl.innerText.trim() : '',
    company: companyEl ? companyEl.innerText.trim() : '',
    jdText: descEl ? descEl.innerText.trim() : '',
    jdUrl: window.location.href
  };
}

function extractIndeed() {
  const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title span');
  const companyEl = document.querySelector('[data-testid="inlineHeader-companyName"]');
  const descEl = document.querySelector('#jobDescriptionText');

  return {
    portal: 'indeed',
    jobTitle: titleEl ? titleEl.innerText.trim() : '',
    company: companyEl ? companyEl.innerText.trim() : '',
    jdText: descEl ? descEl.innerText.trim() : '',
    jdUrl: window.location.href
  };
}

function extractInternshala() {
  const titleEl = document.querySelector('.profile_on_detail_page');
  const companyEl = document.querySelector('.company_and_premium .company_name');
  const descEl = document.querySelector('.detail_view .text-container') || document.querySelector('.internship_details');

  return {
    portal: 'internshala',
    jobTitle: titleEl ? titleEl.innerText.trim() : '',
    company: companyEl ? companyEl.innerText.trim() : '',
    jdText: descEl ? descEl.innerText.trim() : '',
    jdUrl: window.location.href
  };
}

function extractJobDetails() {
  const host = window.location.hostname;
  if (host.includes('linkedin.com')) {
    return extractLinkedIn();
  } else if (host.includes('naukri.com')) {
    return extractNaukri();
  } else if (host.includes('indeed.com')) {
    return extractIndeed();
  } else if (host.includes('internshala.com')) {
    return extractInternshala();
  }
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_JOB') {
    const details = extractJobDetails();
    const hasJobContext = !!(
      details &&
      (details.jdText ||
        (details.jobTitle && details.jobTitle !== 'Unknown Position') ||
        (details.company && details.company !== 'Unknown Company') ||
        details.jdUrl)
    );

    if (hasJobContext) {
      sendResponse({ success: true, data: details });
    } else {
      sendResponse({ success: false, error: 'Could not extract job description from this page. Please make sure a job is fully open.' });
    }
  }
  return true;
});

/**
 * Auto-trigger sidebar when running as a content script on job pages.
 * content.js, keyword-engine.js and sidebar-ui.js all run in the same
 * content script context so they share scope directly.
 */
(function initResumeIQOnJobPage() {
  // Wait a moment for LinkedIn's SPA to render the job content
  let initAttempts = 0;
  
  function tryInit() {
    initAttempts++;
    const details = extractJobDetails();
    const hasJobContext = details && (
      details.jdText?.length > 100 ||
      (details.jobTitle && details.jobTitle !== 'Unknown Position') ||
      (details.company && details.company !== 'Unknown Company')
    );
    
    if (hasJobContext) {
      // Pass to sidebar-ui.js which runs in same content script scope
      if (typeof initResumeIQSidebar === 'function') {
        initResumeIQSidebar(details);
      }
    } else if (initAttempts < 8) {
      // Retry — LinkedIn SPA may still be loading
      setTimeout(tryInit, 1200);
    }
  }
  
  // Initial attempt after DOM idle
  setTimeout(tryInit, 800);
  
  // Re-init on LinkedIn SPA navigation (URL change without page reload)
  let lastUrl = location.href;
  const navObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      initAttempts = 0;
      // Tear down old sidebar UI
      if (typeof destroyResumeIQSidebar === 'function') {
        destroyResumeIQSidebar();
      }
      // Re-init after new content loads
      setTimeout(tryInit, 1400);
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });
})();
