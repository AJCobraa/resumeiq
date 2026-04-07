/**
 * Content Script - Extracts Job Description & Details from supported portals
 * Listens for messages from the popup/background script.
 */

function extractLinkedIn() {
  const titleEl = document.querySelector('h1.ember-view') 
    || document.querySelector('.job-details-jobs-unified-top-card__job-title')
    || document.querySelector('.job-details-jobs-unified-top-card__job-title-link')
    || document.querySelector('.t-24.t-bold')
    || document.querySelector('h2');
    
  const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name') 
    || document.querySelector('.job-details-jobs-unified-top-card__subtitle-primary-grouping > a')
    || document.querySelector('.job-details-jobs-unified-top-card__primary-description a')
    || document.querySelector('.app-aware-link');

  const descEl = document.querySelector('#job-details') 
    || document.querySelector('.jobs-description-content__text')
    || document.querySelector('.jobs-description__container')
    || document.querySelector('article')
    || document.querySelector('.job-details-module__content');

  let jdText = '';
  if (descEl) {
    jdText = descEl.innerText.trim();
  } else {
    // Ultimate fallback for right-panel JD
    const rightPanel = document.querySelector('.jobs-search__job-details--container') 
      || document.querySelector('.job-view-layout')
      || document.querySelector('.job-details-module');
      
    if (rightPanel) {
      jdText = rightPanel.innerText.trim();
    } else {
      // If we literally can't find any standardized wrapper, we just send the whole page text.
      // Gemma/text-embedding will just pick the job description out of the noise.
      jdText = document.body.innerText.trim().substring(0, 15000);
    }
  }

  return {
    portal: 'linkedin',
    jobTitle: titleEl ? titleEl.innerText.trim() : 'Unknown Position',
    company: companyEl ? companyEl.innerText.trim() : 'Unknown Company',
    jdText: jdText,
    jdUrl: window.location.href
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
    if (details && details.jdText) {
      sendResponse({ success: true, data: details });
    } else {
      sendResponse({ success: false, error: 'Could not extract job description from this page. Please make sure a job is fully open.' });
    }
  }
  return true;
});
