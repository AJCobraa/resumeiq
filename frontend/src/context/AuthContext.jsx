/**
 * AuthContext — manages Firebase Authentication state.
 * Provides user object, loading state, and sign-in/sign-out functions.
 * Wraps the entire app so all components can access auth state.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, onAuthChange } from '../lib/firebase'
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
      // onAuthChange will handle setting user + profile
    } catch (err) {
      logger.error('Sign-in failed:', err)
      setLoading(false)
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
