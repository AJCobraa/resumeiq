/**
 * background.js
 * Service Worker for the Chrome Extension.
 * Persists Auth Token and handles cross-origin comms if needed.
 */
import './config.js';

let authToken = null;

// Listen for token updates from auth-sync script
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
      return true; // async response
    }
  }
});

// Load token from storage on startup
chrome.storage.local.get(['resumeIqToken'], (res) => {
  if (res.resumeIqToken) {
    authToken = res.resumeIqToken;
  }
});
