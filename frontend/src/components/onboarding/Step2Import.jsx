import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, CheckCircle2, Lock } from 'lucide-react'

export default function Step2Import() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const sequence = async () => {
      // 0: Initial
      await new Promise(r => setTimeout(r, 600))
      // 1: File dropped
      setPhase(1)
      await new Promise(r => setTimeout(r, 800))
      // 2: Parsing
      setPhase(2)
      await new Promise(r => setTimeout(r, 1500))
      // 3: Card appears
      setPhase(3)
      await new Promise(r => setTimeout(r, 800))
      // 4: Badges appear
      setPhase(4)
    }
    sequence()
  }, [])

  return (
    <div className="w-full h-full max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      {/* Left: Animation */}
      <div className="relative h-[500px] w-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Phase 0-2: Dropzone & Parsing */}
          {phase < 3 && (
            <motion.div
              key="dropzone"
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <motion.div
                animate={{
                  borderColor: phase >= 1 ? 'hsl(142 76% 36%)' : 'hsl(var(--border))',
                  backgroundColor: phase >= 1 ? 'hsl(142 76% 36% / 0.05)' : 'transparent',
                }}
                className="w-full h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center relative overflow-hidden"
              >
                {/* Dropped File */}
                <motion.div
                  initial={{ y: -200, opacity: 0, scale: 0.8 }}
                  animate={{
                    y: phase >= 1 ? 0 : -200,
                    opacity: phase >= 1 ? 1 : 0,
                    scale: phase >= 1 ? 1 : 0.8,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="bg-card border border-border/60 shadow-soft rounded-xl p-4 flex flex-col items-center gap-2 mb-4 relative z-10"
                >
                  <FileText className="w-10 h-10 text-primary" />
                  <span className="text-sm font-semibold text-foreground">My_Resume.pdf</span>
                </motion.div>

                {/* Progress Bar */}
                <AnimatePresence>
                  {phase === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-4/5 flex flex-col items-center gap-3 relative z-10"
                    >
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 1.2, ease: 'easeInOut' }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Parsing with AI...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}

          {/* Phase 3-4: Structured Card */}
          {phase >= 3 && (
            <motion.div
              key="resumecard"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="w-full max-w-md relative"
            >
              {/* Green check badge */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="absolute -top-3 -right-3 z-20 flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full shadow-soft border border-emerald-200"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wide">Resume Imported</span>
              </motion.div>

              <div className="bg-card rounded-2xl border border-border/60 shadow-glow p-6">
                <div className="mb-6 pb-4 border-b border-border/40">
                  <h3 className="text-xl font-bold text-foreground">Alex Johnson</h3>
                  <p className="text-sm text-muted-foreground">Software Engineer</p>
                </div>
                <div className="space-y-4">
                  <div className="h-2 bg-secondary rounded-full w-3/4" />
                  <div className="h-2 bg-secondary rounded-full w-full" />
                  <div className="h-2 bg-secondary rounded-full w-5/6" />
                  <div className="h-2 bg-secondary rounded-full w-full" />
                  <div className="h-2 bg-secondary rounded-full w-4/5" />
                </div>
              </div>

              {/* Action Pills */}
              {phase >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
                  className="mt-6 flex flex-col items-center gap-3"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-semibold">⭐ Marked as Base Resume</span>
                  </motion.div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground"
                  >
                    You can have multiple base resumes
                  </motion.span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Text */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col max-w-lg"
      >
        <h2 className="text-4xl font-bold tracking-tight text-foreground mb-6">
          Start with your master resume
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          Import a PDF or build from scratch. It's automatically saved as your{' '}
          <strong className="text-foreground">⭐ Base Resume</strong> — a protected
          master copy that never gets modified directly.
        </p>
        <div className="px-4 py-3 bg-secondary/50 rounded-xl border border-border/40 inline-flex">
          <span className="text-sm text-muted-foreground">
            💡 You can mark any resume as Base from your dashboard
          </span>
        </div>
      </motion.div>
    </div>
  )
}
