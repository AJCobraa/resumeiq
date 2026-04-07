/**
 * Firebase SDK initialization for the frontend.
 * ONLY used for Authentication — never for direct Firestore writes.
 * All data operations go through the FastAPI backend via api.js.
 */
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onIdTokenChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export function onAuthChange(callback) {
  return onIdTokenChanged(auth, callback)
}
