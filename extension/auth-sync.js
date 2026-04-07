/**
 * auth-sync.js
 * Injected into localhost:5173 to sync the Firebase ID token with extension storage.
 */

function extractFirebaseToken() {
  return localStorage.getItem('resumeIqExtToken') || null;
}

function syncToken() {
  const token = extractFirebaseToken();
  if (token) {
    chrome.runtime.sendMessage({ action: 'SYNC_TOKEN', token });
  } else {
    chrome.runtime.sendMessage({ action: 'CLEAR_TOKEN' });
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

// Since Firebase updates indexedDB or doesn't trigger storage event on same tab always, poll occasionally
setInterval(syncToken, 5000);
