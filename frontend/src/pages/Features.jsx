import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import TopNavBar from '../components/layout/TopNavBar'
import DeepDiveFeatures from '../components/landing/DeepDiveFeatures'
import CoinSystemExplanation from '../components/landing/CoinSystemExplanation'

export default function Features() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* ═══ Header ══════════════════════════════════════ */}
      <TopNavBar />

      <main className="flex-grow pt-20">
        {/* Features Header */}
        <section className="py-24 px-6 text-center max-w-4xl mx-auto">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1.5 rounded-full bg-card border border-border/60 text-primary text-xs font-bold tracking-widest uppercase mb-4 shadow-soft">
              Intelligence
            </span>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6 text-balance">
              Not just a builder.<br/>
              An <span className="text-primary">Intelligence Engine.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              ResumeIQ goes beyond standard templates, giving you the tools to surgically target roles, maintain infinite versions of your career, and intelligently spend compute power to secure interviews.
            </p>
          </motion.div>
        </section>

        {/* Deep Dive Features */}
        <DeepDiveFeatures />

        {/* Coin System */}
        <CoinSystemExplanation />
      </main>

      {/* ═══ Footer ══════════════════════════════════════ */}
      <footer className="py-12 px-6 border-t border-border/40 bg-surface-hover">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-xl font-bold tracking-tight text-foreground">ResumeIQ</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <Link to="/features" className="hover:text-primary transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
