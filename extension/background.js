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
  }
});

// Load token from storage on startup
chrome.storage.local.get(['resumeIqToken'], (res) => {
  if (res.resumeIqToken) {
    authToken = res.resumeIqToken;
  }
});
