/**
 * auth-sync.js
 * Injected into localhost:5173 to sync the Firebase ID token with extension storage.
 */

function extractFirebaseToken() {
  return localStorage.getItem('resumeIqExtToken') || null;
}

function syncToken() {
  // If the extension context is gone, stop trying and clear the interval
  if (!chrome.runtime?.id) {
    if (window.syncInterval) clearInterval(window.syncInterval);
    return;
  }

  const token = extractFirebaseToken();
  try {
    if (token) {
      chrome.runtime.sendMessage({ action: 'SYNC_TOKEN', token });
    } else {
      chrome.runtime.sendMessage({ action: 'CLEAR_TOKEN' });
    }
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      if (window.syncInterval) clearInterval(window.syncInterval);
      console.warn('ResumeIQ: Extension updated. Context invalidated.');
    }
  }
}

// Sync on load
syncToken();

// Intercept storage events
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('firebase:authUser:')) {
    syncToken();
  }
});

// Assign the interval to a window variable so we can clear it if the context dies
window.syncInterval = setInterval(syncToken, 5000);
