import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

/* ─── Spring transition presets ───────────────────────── */
const spring = { type: 'spring', stiffness: 300, damping: 30 }
const gentleSpring = { type: 'spring', stiffness: 200, damping: 24 }

/* ── Animation variants ───────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 24, duration: 0.6 },
  },
}

/* ── Card 1: Semantic Matching ────────────────────────── */
function SemanticMatchingCard() {
  const [state, setState] = useState('B')

  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => (prev === 'A' ? 'B' : 'A'))
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div
      whileHover={{ y: -3, transition: spring }}
      className="md:col-span-2 bg-card rounded-3xl border border-border/60 shadow-soft p-8 hover:shadow-glow transition-shadow duration-500 overflow-hidden"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Semantic Matching</h3>
        <p className="text-sm text-muted-foreground mt-1">Keyword matching is dead.</p>
      </div>

      <div className="relative h-48">
        <AnimatePresence mode="wait">
          {state === 'A' ? (
            <motion.div
              key="competitor"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={gentleSpring}
              className="absolute inset-0 bg-secondary rounded-2xl p-5 border border-border/60 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Competitor Tool</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] text-muted-foreground">Resume Analysis</span>
                  <span className="text-[10px] text-muted-foreground">keyword scan</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-border rounded-full w-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '0%' }} className="h-full bg-destructive/60" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-destructive font-medium text-sm">0% Keyword Match</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Missing: "Python", "SQL"...</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="resumeiq"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={gentleSpring}
              className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-card rounded-2xl p-5 border border-emerald-200/60 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">ResumeIQ</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] text-emerald-500">Resume Analysis</span>
                  <span className="text-[10px] text-emerald-500">semantic engine</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-emerald-100 rounded-full w-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-600 font-medium text-sm">85% Semantic Match</span>
                  </div>
                  <span className="text-xs text-emerald-500 font-medium">Context understood</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ── Card 2: Auto-Approve ─────────────────────────────── */
function AutoApproveCard() {
  const [phase, setPhase] = useState(1)

  useEffect(() => {
    const sequence = async () => {
      setPhase(1)
      await new Promise(r => setTimeout(r, 2500))
      setPhase(2)
      await new Promise(r => setTimeout(r, 500))
      setPhase(3)
      await new Promise(r => setTimeout(r, 2000))
      sequence()
    }
    const timer = setTimeout(sequence, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      whileHover={{ y: -3, transition: spring }}
      className="bg-card rounded-3xl border border-border/60 shadow-soft p-8 hover:shadow-glow transition-shadow duration-500"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Auto-Approve Suggestions</h3>
        <p className="text-sm text-muted-foreground mt-1">One click rewrites your resume.</p>
      </div>

      <div className="h-44 relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === 1 && (
            <motion.div
              key="phase1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={gentleSpring}
              className="w-full bg-secondary rounded-2xl p-4 border border-border/60"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md uppercase tracking-wider">High Impact</span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Suggested rewrite:</span>
              </div>
              <p className="text-sm text-primary leading-relaxed mb-4">
                Architected microservices reducing p99 latency by 40% across 3 services
              </p>
              <div className="flex gap-2">
                <button className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm">Approve</button>
                <button className="text-muted-foreground text-xs px-2 py-1.5">Dismiss</button>
              </div>
            </motion.div>
          )}

          {phase === 2 && (
            <motion.div
              key="phase2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full bg-secondary rounded-2xl p-4 border border-border/60 flex items-center justify-center h-full"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-muted-foreground">Approving...</span>
              </div>
            </motion.div>
          )}

          {phase === 3 && (
            <motion.div
              key="phase3"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={gentleSpring}
              className="w-full bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-emerald-600">Applied to resume!</span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground line-through">Managed backend performance and infrastructure</p>
                <p className="text-xs text-emerald-600 font-medium">Architected microservices reducing p99 latency by 40%...</p>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground text-right italic font-medium">Bullet updated instantly</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ── Card 3: Interview Predictor ──────────────────────── */
function InterviewPredictorCard() {
  const [phase, setPhase] = useState('select')

  useEffect(() => {
    const sequence = async () => {
      setPhase('select')
      await new Promise(r => setTimeout(r, 1500))
      setPhase('loading')
      await new Promise(r => setTimeout(r, 1800))
      setPhase('reveal')
      await new Promise(r => setTimeout(r, 5000))
      sequence()
    }
    const timer = setTimeout(sequence, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      whileHover={{ y: -3, transition: spring }}
      className="lg:col-span-3 bg-card rounded-3xl border border-border/60 shadow-soft p-8 hover:shadow-glow transition-shadow duration-500"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Interactive demo */}
        <div className="flex flex-col h-full">
          <div className="mb-8">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Interview Predictor</h3>
            <p className="text-sm text-muted-foreground mt-1">Coached for FAANG.</p>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Company Tier</label>
              <div className="flex items-center justify-between px-3 py-2.5 bg-card border border-border/60 rounded-xl text-sm font-medium text-foreground">
                <span>{phase === 'select' ? 'Select tier...' : 'Unicorn / FAANG'}</span>
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative h-48 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {phase === 'select' && (
                  <motion.p
                    key="select"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-center text-sm text-muted-foreground px-8"
                  >
                    Select a company tier to generate personalized interview prep
                  </motion.p>
                )}

                {phase === 'loading' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="h-4 bg-secondary rounded-lg animate-pulse w-3/4" />
                      <div className="h-4 bg-secondary rounded-lg animate-pulse w-full" />
                      <div className="h-4 bg-secondary rounded-lg animate-pulse w-2/3" />
                    </div>
                    <div className="space-y-2 pt-4">
                      <div className="h-4 bg-secondary rounded-lg animate-pulse w-full" />
                      <div className="h-4 bg-secondary rounded-lg animate-pulse w-4/5" />
                    </div>
                  </motion.div>
                )}

                {phase === 'reveal' && (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={gentleSpring}
                    className="space-y-3"
                  >
                    <div className="bg-secondary rounded-2xl p-3.5 border border-border/60">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Predicted Question</span>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">System Design</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed font-medium">
                        "Design a distributed caching system that handles 1M+ requests/sec with sub-ms latency."
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-primary/5 to-card rounded-2xl p-3.5 border border-primary/20">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Strategic Answer</span>
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Coaching</span>
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        Start with requirements clarification, then propose Redis Cluster with consistent hashing. Mention write-through vs write-back tradeoffs...
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right: Feature list */}
        <div className="flex flex-col justify-center space-y-8 py-4">
          {[
            { num: '1', color: 'bg-primary/10 text-primary', title: 'Tier-Specific Prep', desc: 'Questions tailored to FAANG, Unicorn, or Startup hiring bars' },
            { num: '2', color: 'bg-emerald-100 text-emerald-600', title: 'Gap Analysis', desc: 'Identifies missing skills and generates targeted practice' },
            { num: '3', color: 'bg-amber-100 text-amber-600', title: 'Strategic Coaching', desc: 'STAR-format answers with industry-specific frameworks' },
          ].map((item) => (
            <div key={item.num} className="flex items-start gap-4">
              <div className={`h-8 w-8 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                <span className="font-bold text-sm">{item.num}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-0.5">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main Landing Page ────────────────────────────────── */
export default function Landing() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  const handleSignIn = async () => {
    try {
      setSigningIn(true)
      await signIn()
    } catch {
      setSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/10 selection:text-primary">

      {/* ═══ Sticky Nav ══════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
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
            onClick={user ? () => navigate('/dashboard') : handleSignIn}
            disabled={signingIn}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-brand-dark text-primary-foreground text-sm font-semibold rounded-xl px-4 py-2 shadow-sm hover:shadow-glow transition-all duration-300 disabled:opacity-70"
          >
            {signingIn ? 'Signing in...' : user ? 'Open Dashboard' : 'Get Started'}
            {!signingIn && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ═══ Hero Section ═══════════════════════════════ */}
      <section className="relative pt-32 pb-40 px-6 overflow-hidden">
        <motion.div
          className="max-w-4xl mx-auto text-center relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Trust Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-card border border-border/60 shadow-soft mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">Trusted by 10,000+ job seekers</span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground tracking-tighter leading-[1.05] mb-8 text-balance"
          >
            Land your dream job with{' '}
            <span className="bg-gradient-to-r from-primary to-brand-dark bg-clip-text text-transparent">
              AI-powered resumes
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-14"
          >
            ResumeIQ uses semantic AI to optimize your resume for any job posting,
            helping you beat ATS systems and stand out to recruiters.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-primary to-brand-dark text-primary-foreground font-bold rounded-2xl px-8 py-4 shadow-glow hover:shadow-[0_12px_40px_hsl(239_84%_67%_/_0.3)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 active:translate-y-0"
            >
              {signingIn ? 'Please wait...' : 'Get Started Free'}
              {!signingIn && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
            <button className="w-full sm:w-auto bg-card border border-border/60 text-foreground font-bold rounded-2xl px-8 py-4 hover:bg-surface-hover transition-colors duration-200 shadow-soft">
              Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-80 bg-primary/5 blur-3xl -z-10 rounded-full" />
      </section>

      {/* ═══ Bento Grid Section ═════════════════════════ */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={gentleSpring}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-card border border-border/60 shadow-soft mb-6">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-1.5 w-1.5 rounded-full bg-primary"
              />
              <span className="text-xs font-semibold text-muted-foreground tracking-wide">The ResumeIQ Difference</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tighter mb-6 text-balance">
              Old ATS scanners look for words.<br />
              <span className="text-muted-foreground font-normal">We look for meaning.</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Stop keyword stuffing. Our vector-based semantic engine understands your actual experience,
              rewrites your bullets flawlessly, and preps you for the technical interview.
            </p>
          </motion.div>

          {/* Bento Grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ ...gentleSpring, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <SemanticMatchingCard />
            <AutoApproveCard />
            <InterviewPredictorCard />
          </motion.div>
        </div>
      </section>

      {/* ═══ Footer ══════════════════════════════════════ */}
      <footer className="py-12 px-6 border-t border-border/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-brand-dark flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">R</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">© {new Date().getFullYear()} ResumeIQ. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-10">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
