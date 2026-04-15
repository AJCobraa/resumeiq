/**
 * background.js
 * Service Worker for the Chrome Extension.
 * Persists Auth Token and handles cross-origin comms if needed.
 */
import './config.js';

let authToken = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SYNC_TOKEN') {
    authToken = request.token;
    chrome.storage.local.set({ resumeIqToken: authToken });

  } else if (request.action === 'CLEAR_TOKEN') {
    authToken = null;
    chrome.storage.local.remove('resumeIqToken');

  } else if (request.action === 'GET_TOKEN') {
    if (authToken) {
      sendResponse({ token: authToken });
    } else {
      chrome.storage.local.get(['resumeIqToken'], (res) => {
        sendResponse({ token: res.resumeIqToken || null });
      });
      return true; // keep channel open for async storage read
    }

  } else if (request.action === 'OPEN_DASHBOARD') {
    const base = (typeof CONFIG !== 'undefined' ? CONFIG.frontendUrl : 'http://localhost:5173');
    chrome.tabs.create({ url: base + '/dashboard' });

  } else if (request.action === 'OPEN_URL') {
    // Sidebar cannot call chrome.tabs directly — routes here instead.
    if (request.url) {
      chrome.tabs.create({ url: request.url });
    }

  } else if (request.action === 'OPEN_POPUP') {
    if (chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
      });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    }

  } else if (request.action === 'PROXY_FETCH') {
    // Proxy fetch for content scripts (to bypass LinkedIn CSP/CORS)
    const { url, options } = request;
    
    fetch(url, options)
      .then(async (res) => {
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch (e) {}

        sendResponse({
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          text: text,
          json: json
        });
      })
      .catch((err) => {
        console.error('Background Fetch Error:', err);
        sendResponse({ 
          ok: false, 
          status: 0,
          error: err.message || 'Network error or blocked request' 
        });
      });
    return true; // Keep message channel open for async response
  }
});

// Load token from storage on startup
chrome.storage.local.get(['resumeIqToken'], (res) => {
  if (res.resumeIqToken) {
    authToken = res.resumeIqToken;
  }
});
