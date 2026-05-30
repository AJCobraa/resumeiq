import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { logger } from '../../lib/logger'

export default function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)

  const { signIn, signInWithEmail, signUpWithEmail, resetPassword } = useAuth()

  if (!isOpen) return null

  const handleAuthError = (err) => {
    logger.error('Auth error:', err)
    const code = err.code || ''

    switch (code) {

      // ── Sign-in errors ────────────────────────────────────────────
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        setError('Incorrect email or password. Please check your credentials and try again.')
        break

      case 'auth/user-disabled':
        setError('This account has been disabled. Please contact support.')
        break

      case 'auth/too-many-requests':
        setError('Too many failed attempts. Your account has been temporarily locked. Reset your password or try again later.')
        break

      case 'auth/invalid-email':
        setError('Please enter a valid email address.')
        break

      case 'auth/user-token-expired':
      case 'auth/requires-recent-login':
        setError('Your session has expired. Please sign in again.')
        break

      // ── Sign-up errors ────────────────────────────────────────────
      case 'auth/email-already-in-use':
        setError('An account with this email already exists. Try signing in instead.')
        break

      case 'auth/weak-password':
        setError('Password must be at least 6 characters long.')
        break

      case 'auth/password-does-not-meet-requirements':
        // Firebase returns a long message string — parse it to extract what's missing,
        // or fall back to showing a clear requirements list.
        setError(
          'Your password does not meet the requirements: at least 8 characters, ' +
          'one uppercase letter, one number, and one special character (e.g. @, #, !).'
        )
        break

      case 'auth/operation-not-allowed':
        setError('Email/password sign-in is not enabled. Please use Google Sign-In.')
        break

      case 'auth/missing-password':
        setError('Please enter a password.')
        break

      case 'auth/missing-email':
        setError('Please enter your email address.')
        break

      // ── Network / general errors ──────────────────────────────────
      case 'auth/network-request-failed':
        setError('Network error. Please check your internet connection and try again.')
        break

      case 'auth/internal-error':
        setError('An internal error occurred. Please try again in a moment.')
        break

      case 'auth/invalid-api-key':
      case 'auth/app-not-authorized':
        setError('Authentication configuration error. Please contact support.')
        break

      // ── Fallback ──────────────────────────────────────────────────
      default:
        // Surface the Firebase message if available, otherwise show a generic fallback.
        // This ensures any future unhandled codes still give the user some information.
        if (err.message && err.message.length < 200) {
          setError(err.message.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.$/, '').trim())
        } else {
          setError('An unexpected error occurred. Please try again.')
        }
        break
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName)
        setVerificationSent(true)
      } else {
        await signInWithEmail(email, password)
        onClose()
      }
    } catch (err) {
      if (err.code === 'auth/unverified-email') {
        setNeedsVerification(true)
      } else {
        handleAuthError(err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setLoading(true)
      await signIn()
      onClose()
    } catch (err) {
      handleAuthError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }
    try {
      setError('')
      await resetPassword(email)
      setResetSent(true)
      setTimeout(() => setResetSent(false), 5000)
    } catch (err) {
      handleAuthError(err)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="cursor-pointer absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-card border border-border shadow-glow rounded-3xl p-8 overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="cursor-pointer absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-brand-dark flex items-center justify-center shadow-sm mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">R</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {verificationSent ? 'Check your inbox' : isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {verificationSent 
              ? `We've sent a verification link to ${email}`
              : isSignUp ? 'Start optimizing your career today' : 'Log in to your ResumeIQ account'}
          </p>
        </div>

        {verificationSent ? (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-foreground font-medium mb-2">Verification Email Sent!</p>
              <p className="text-xs text-muted-foreground">
                Please click the link in the email to verify your account. You can close this window now.
              </p>
              <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                <p className="text-[11px] text-primary font-bold">
                  Please check your spam/junk folder for the verification email!
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer w-full bg-secondary text-foreground font-bold rounded-xl py-3 hover:bg-secondary/80 transition-all"
            >
              Close Window
            </button>
          </div>
        ) : (
          <>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="cursor-pointer text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button className="cursor-pointer"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.882 9.882L5.172 5.172M19 19L5 5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {isSignUp && (
            <p className="text-[11px] text-muted-foreground ml-1 mt-1">
              Min. 8 characters with an uppercase letter, number, and special character.
            </p>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium p-3 rounded-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </motion.div>
            )}
            {resetSent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium p-3 rounded-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Password reset email sent!
              </motion.div>
            )}
            {needsVerification && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-medium p-3 rounded-xl flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Please verify your email before signing in. Check your inbox!
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-brand-dark text-primary-foreground font-bold rounded-xl py-3 shadow-glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground font-bold tracking-widest">OR</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="cursor-pointer w-full bg-card border border-border text-foreground font-semibold rounded-xl py-3 hover:bg-secondary transition-colors flex items-center justify-center gap-3 shadow-soft"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button className="cursor-pointer"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="text-primary font-bold hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Create one'}
          </button>
        </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
