/**
 * AuthContext — manages Firebase Authentication state.
 * Provides user object, loading state, and sign-in/sign-out functions.
 * Wraps the entire app so all components can access auth state.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { 
  auth, 
  googleProvider, 
  onAuthChange,
  sendEmailVerification,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  signOut
} from '../lib/firebase'
import { api } from '../lib/api'
import { logger } from '../lib/logger'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Block unverified email/password users from accessing the app
        const isEmailPasswordUser = firebaseUser.providerData.some(p => p.providerId === 'password')
        if (isEmailPasswordUser && !firebaseUser.emailVerified) {
          logger.warn('Unverified email/password user blocked:', firebaseUser.email)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setUser(firebaseUser)
        // Explicitly expose token for Chrome Extension content script
        firebaseUser.getIdToken().then(token => {
          localStorage.setItem('resumeIqExtToken', token)
        }).catch(() => {})

        try {
          const profileData = await api.getMe()
          setProfile(profileData)
        } catch (err) {
          logger.error('Failed to fetch profile:', err)
        }
      } else {
        setUser(null)
        setProfile(null)
        localStorage.removeItem('resumeIqExtToken')
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = async () => {
    try {
      setLoading(true)
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      logger.error('Sign-in failed:', err)
      setLoading(false)
      throw err
    }
  }

  const signInWithEmail = async (email, password) => {
    try {
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      setLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      if (displayName) {
        await updateProfile(userCredential.user, { displayName })
      }

      // Send verification email
      await sendEmailVerification(userCredential.user)
      
      // Sign out immediately so they have to verify before logging in
      await signOut(auth)
      
      setLoading(false)
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      throw err
    }
  }

  const logOut = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      logger.error('Sign-out failed:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signInWithEmail, 
      signUpWithEmail, 
      resetPassword, 
      logOut 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
