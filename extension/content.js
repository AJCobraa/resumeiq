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

    // Remove known UI boilerplate fragments that frequently pollute the right panel extraction.
    const boilerplatePatterns = [
      /Get job alerts for this search[\s\S]*$/i,
      /Are these results helpful\?[\s\S]*$/i,
      /About Accessibility Help Center Privacy[\s\S]*$/i,
      /LinkedIn Corporation © \d{4}[\s\S]*$/i,
      /Reactivate Premium[\s\S]*$/i,
      /Job search faster with Premium[\s\S]*$/i,
      /Interested in working with us in the future\?[\s\S]*$/i,
    ];

    let cleaned = text;
    for (const pattern of boilerplatePatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }

    // Prefer slicing from true JD anchors when present.
    const anchors = [
      'About the job',
      'What Do We Do',
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

    if (anchorIndex > 0) {
      cleaned = cleaned.slice(anchorIndex).trim();
    }

    return cleaned;
  };

  const container = document.querySelector('.jobs-search__job-details--container')
    || document.querySelector('.job-view-layout')
    || document.querySelector('.jobs-details__main-content')
    || document.querySelector('.scaffold-layout__detail')
    || document.querySelector('main')
    || document;

  let title = firstText([
    '.job-details-jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title-link',
    'h1.ember-view',
    '.job-title',
    '.t-24.t-bold',
    'h1.t-24.t-bold',
    'h2.t-24',
    '.jobs-unified-top-card__job-title',
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

  // If search/feed text is prepended, trim to selected title occurrence.
  if (cleanedTitle) {
    const titleIdx = cleanedJd.toLowerCase().indexOf(cleanedTitle.toLowerCase());
    if (titleIdx > 0) {
      const before = cleanedJd.slice(0, titleIdx);
      if (/99\+\s+results|promoted jobs are ranked|Viewed · Posted on|Easy Apply/i.test(before)) {
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
