import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { UploadCloud, PlusCircle } from 'lucide-react'

export default function Step6Ready() {
  const navigate = useNavigate()

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 2000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min, max) => Math.random() * (max - min) + min

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#0a9d76', '#6366f1', '#ffffff']
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#0a9d76', '#6366f1', '#ffffff']
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center max-w-3xl w-full">
        
        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mb-8"
        >
          <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <motion.path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-foreground text-center mb-12"
        >
          You're all set, let's find your next role 🚀
        </motion.h1>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mb-8">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 20 }}
            className="group relative bg-card rounded-2xl border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.1)] p-6 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Import Your Resume</h3>
            <p className="text-sm text-muted-foreground mb-6">Start with your existing PDF</p>
            <button
              onClick={() => navigate('/resumes?action=import')}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Import PDF &rarr;
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 20 }}
            className="group relative bg-card rounded-2xl border border-border/60 shadow-soft p-6 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-secondary text-foreground rounded-xl flex items-center justify-center mb-4">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Build from Scratch</h3>
            <p className="text-sm text-muted-foreground mb-6">Create a new resume with AI</p>
            <button
              onClick={() => navigate('/resumes?action=create')}
              className="w-full bg-transparent border-2 border-foreground text-foreground font-semibold py-2.5 rounded-xl hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-2"
            >
              Create Resume &rarr;
            </button>
          </motion.div>

        </div>

        {/* Muted link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            or explore the dashboard first &rarr;
          </button>
        </motion.div>

      </div>
    </div>
  )
}
