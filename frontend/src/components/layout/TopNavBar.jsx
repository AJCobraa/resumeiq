import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import AuthModal from '../auth/AuthModal'
import { AnimatePresence } from 'framer-motion'

export default function TopNavBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      setShowAuthModal(true)
    }
  }

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-brand-dark flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">
              Resume<span className="text-foreground">IQ</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </div>

          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-brand-dark text-primary-foreground text-sm font-semibold rounded-xl px-4 py-2 shadow-sm hover:shadow-glow transition-all duration-300"
          >
            {user ? 'Open Dashboard' : 'Get Started'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
      </AnimatePresence>
    </>
  )
}
