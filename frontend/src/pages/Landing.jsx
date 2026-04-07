import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

/* ── Animated ATS Score Ring ──────────────────────────── */
function AnimatedScore({ from = 43, to = 81, duration = 2500 }) {
  const [score, setScore] = useState(from)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const start = performance.now()
          const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setScore(Math.round(from + (to - from) * eased))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [from, to, duration])

  const getColor = (s) => {
    if (s >= 75) return '#22C55E'
    if (s >= 50) return '#F59E0B'
    return '#EF4444'
  }

  const circumference = 2 * Math.PI * 80
  const progress = (score / 100) * circumference

  return (
    <div ref={ref} className="relative w-56 h-56 lg:w-64 lg:h-64">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="80" fill="none"
          stroke="#1E1E2E" strokeWidth="6" />
        <circle cx="90" cy="90" r="80" fill="none"
          stroke={getColor(score)} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 0.1s ease-out, stroke 0.3s ease' }}
        />
        <circle cx="90" cy="90" r="80" fill="none"
          stroke={getColor(score)} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          opacity="0.15" filter="blur(8px)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-6xl lg:text-7xl font-bold tracking-tight"
          style={{ color: getColor(score) }}>
          {score}
        </span>
        <span className="text-text-muted text-sm mt-2 tracking-wide uppercase">ATS Score</span>
      </div>
    </div>
  )
}

/* ── Floating Particle Background ─────────────────────── */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            background: i % 2 === 0 ? '#4F8EF7' : '#A855F7',
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `float ${6 + i * 1.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) translateX(0px); }
          100% { transform: translateY(-30px) translateX(15px); }
        }
      `}</style>
    </div>
  )
}

/* ── Feature Card Data ────────────────────────────────── */
const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Semantic ATS Analysis',
    desc: 'Not just keywords — actual meaning. Our AI understands context, synonyms, and industry terminology to give you a true ATS match score.',
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: 'One-Click Bullet Rewrites',
    desc: 'AI rewrites your existing bullets to better match the job description. Approve with one click — changes save instantly to your resume.',
    gradient: 'from-purple-500/20 to-pink-500/10',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Application Dashboard',
    desc: 'Track every job application in one place. See ATS scores, manage status, and monitor your improvement over time.',
    gradient: 'from-emerald-500/20 to-teal-500/10',
  },
]

/* ── Stats Row ────────────────────────────────────────── */
const stats = [
  { value: '10x', label: 'Faster Tailoring' },
  { value: '73%', label: 'Avg Score Boost' },
  { value: '4', label: 'Job Portals Supported' },
  { value: '∞', label: 'Free Analyses' },
]

/* ── Landing Page ─────────────────────────────────────── */
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
    <div className="min-h-screen bg-bg-primary overflow-hidden">

      {/* ═══ Nav Bar ═══════════════════════════════════ */}
      <nav className="relative z-20 flex items-center justify-between px-8 lg:px-16 py-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-accent-blue/25">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight">
            Resume<span className="text-accent-blue">IQ</span>
          </span>
        </div>
        <Button onClick={handleSignIn} loading={signingIn} size="md">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </Button>
      </nav>

      {/* ═══ Hero Section ═════════════════════════════ */}
      <section className="relative max-w-[1400px] mx-auto px-8 lg:px-16 pt-20 lg:pt-32 pb-32 lg:pb-44">

        {/* Background effects */}
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-accent-blue/6 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-[20%] right-[5%] w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[40%] w-[350px] h-[350px] bg-cyan-500/4 rounded-full blur-[120px] pointer-events-none" />
        <FloatingParticles />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Left — Copy */}
          <div className="flex-1 max-w-2xl text-center lg:text-left">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-xs font-medium text-accent-blue tracking-wide">AI-Powered Resume Optimization</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight">
              Get past the ATS.
              <br />
              <span className="bg-gradient-to-r from-accent-blue via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Get the interview.
              </span>
            </h1>

            <p className="mt-8 text-lg lg:text-xl text-text-secondary leading-relaxed max-w-xl mx-auto lg:mx-0">
              ResumeIQ reads any job listing and rewrites your resume
              bullets in real time — right from LinkedIn and Naukri.
              One click to apply smarter.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button onClick={handleSignIn} loading={signingIn} size="lg" className="w-full sm:w-auto px-8">
                Start Free — No Credit Card
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                Install Chrome Extension
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center gap-8 justify-center lg:justify-start text-sm text-text-muted">
              {['Free forever', 'No credit card', 'ATS-optimized PDFs'].map((text) => (
                <span key={text} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Right — ATS Score Ring */}
          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-[-20px] rounded-full bg-green/5 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
              {/* Card backing */}
              <div className="bg-bg-card/80 backdrop-blur-sm border border-border-default rounded-3xl p-10 shadow-2xl shadow-black/40">
                <AnimatedScore from={43} to={81} duration={2500} />
              </div>
              {/* Label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs text-text-muted bg-bg-card/90 backdrop-blur px-4 py-2 rounded-full border border-border-default shadow-lg">
                  ✨ Before → After ResumeIQ
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Stats Row ════════════════════════════════ */}
      <section className="relative border-y border-border-default bg-bg-card/50 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-16">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold font-mono bg-gradient-to-b from-text-primary to-text-secondary bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-sm text-text-muted mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features Section ═════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-8 lg:px-16 py-24 lg:py-32">
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Everything you need to{' '}
            <span className="text-accent-blue">land the job</span>
          </h2>
          <p className="mt-4 text-text-muted text-lg max-w-2xl mx-auto">
            From resume building to job application tracking — all powered by AI
            that understands what ATS systems actually look for.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="group relative bg-bg-card border border-border-default rounded-2xl p-8 lg:p-10 hover:border-border-hover hover:shadow-2xl hover:shadow-black/30 transition-all duration-500 hover:-translate-y-1"
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue mb-6 group-hover:bg-accent-blue/20 group-hover:scale-110 transition-all duration-500">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA Section ══════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-8 lg:px-16 pb-24 lg:pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-border-default bg-gradient-to-br from-bg-card via-bg-card to-accent-blue/5 p-12 lg:p-20 text-center">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/8 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/8 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">
              Ready to beat the ATS?
            </h2>
            <p className="text-text-secondary text-lg max-w-lg mx-auto mb-10">
              Join thousands of job seekers who use ResumeIQ to tailor their
              resumes and land more interviews.
            </p>
            <Button onClick={handleSignIn} loading={signingIn} size="lg" className="px-10">
              Get Started — It&apos;s Free
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══════════════════════════════════ */}
      <footer className="border-t border-border-default">
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-blue to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">R</span>
            </div>
            <span>© 2025 ResumeIQ</span>
          </div>
          <span>Powered by Gemma 4 & Firebase</span>
        </div>
      </footer>
    </div>
  )
}
