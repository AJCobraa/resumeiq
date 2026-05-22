import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, FileText, Check, ShieldAlert, GitBranch } from 'lucide-react'

export default function Step5Magic() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Base resume centered (0-800ms)
      setPhase(1)
      await new Promise(r => setTimeout(r, 1500)) // give user time to read

      // Phase 2: Approve clicked, reject animation (800-1200ms)
      setPhase(2)
      await new Promise(r => setTimeout(r, 1500))

      // Phase 3: Branching & new card (1200-2200ms)
      setPhase(3)
      await new Promise(r => setTimeout(r, 2000))

      // Phase 4: Success glow (2200-3000ms)
      setPhase(4)
    }

    // Loop the sequence for demonstration purposes, or just run once?
    // Let's loop it with a long pause at the end so it's a continuous demo
    const timer = setInterval(() => {
      setPhase(0)
      setTimeout(sequence, 500)
    }, 9000)
    
    sequence()
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      
      <div className="relative w-full max-w-5xl h-[450px] flex items-center justify-center mb-12">
        
        {/* Approve Trigger UI Mockup (floating at bottom) */}
        <AnimatePresence>
          {phase >= 1 && phase < 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1c1c1e] text-white p-3 rounded-lg border border-white/10 shadow-2xl z-30 flex items-center gap-4"
            >
              <div className="text-sm">
                <span className="text-white/50 text-xs block">Recommendation</span>
                Rewrite bullet for backend API
              </div>
              <motion.button
                animate={phase === 2 ? { scale: 0.95, backgroundColor: '#0a9d76' } : {}}
                className="bg-white text-black font-semibold text-xs px-4 py-2 rounded flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Approve
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SVG Branching Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
          <motion.path
            d="M 512 225 C 650 225, 650 225, 750 225"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeDasharray="10 5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: phase >= 3 ? 1 : 0,
              opacity: phase >= 3 ? 0.5 : 0
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
          {/* Label on line */}
          {phase >= 4 && (
            <motion.foreignObject 
              x="570" y="195" width="100" height="30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                <GitBranch className="w-3 h-3" /> Auto-branched
              </div>
            </motion.foreignObject>
          )}
        </svg>

        {/* Base Resume Card */}
        <motion.div
          animate={{
            scale: phase >= 3 ? 0.9 : 1, // scales down slightly
            x: phase === 2 ? [0, -5, 5, -5, 5, 0] : (phase >= 3 ? -250 : 0), // shake effect on phase 2
          }}
          transition={{
            x: phase === 2 ? { duration: 0.4 } : { type: 'spring', stiffness: 200, damping: 25 },
            scale: { duration: 0.5 }
          }}
          className="absolute z-10 w-[320px] bg-card rounded-2xl border border-border/60 shadow-xl p-6"
        >
          {/* Protection Overlay */}
          <AnimatePresence>
            {phase === 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20"
              >
                <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-3">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-rose-500">Protected</span>
                <span className="text-xs text-muted-foreground mt-1">Cannot modify base</span>
              </motion.div>
            )}
            {phase >= 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -top-3 -right-3 z-20 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full shadow-sm border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Original protected
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card Content */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
            <h3 className="text-lg font-bold text-foreground">My Software Resume</h3>
          </div>
          <div className="mb-4">
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-xs font-semibold">
              <Lock className="w-3 h-3" /> Base Resume
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
              <div className="h-3 bg-secondary rounded w-full" />
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
              <span className={`text-xs ${phase >= 3 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                Worked on backend APIs
              </span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
              <div className="h-3 bg-secondary rounded w-5/6" />
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
              <div className="h-3 bg-secondary rounded w-4/5" />
            </div>
          </div>
        </motion.div>

        {/* Tailored Resume Card */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ x: 0, opacity: 0, scale: 0.8 }}
              animate={{ x: 250, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="absolute z-20 w-[320px] bg-card rounded-2xl border-2 border-primary/20 shadow-[0_0_40px_hsl(var(--primary)/0.15)] p-6"
            >
              <AnimatePresence>
                {phase >= 4 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -top-3 -right-3 z-20 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full shadow-sm border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Tailored for Google
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/40">
                <h3 className="text-lg font-bold text-foreground">Google - My Software...</h3>
              </div>
              <div className="mb-4 flex flex-col gap-2">
                <span className="inline-flex items-center gap-1 bg-secondary text-muted-foreground px-2.5 py-1 rounded-md text-xs font-semibold w-fit">
                  <FileText className="w-3 h-3" /> Tailored Resume
                </span>
                <span className="text-[10px] text-muted-foreground">Forked from: My Software Resume</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <div className="h-3 bg-secondary rounded w-full" />
                </div>
                {/* Typing effect for new text */}
                <div className="flex items-start gap-2 bg-amber-500/10 -mx-2 px-2 py-1.5 rounded-md border border-amber-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <motion.span 
                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                    animate={{ clipPath: 'inset(0 0% 0 0)' }}
                    transition={{ duration: 1.5, ease: "linear", delay: 0.5 }}
                    className="text-xs text-foreground font-medium leading-relaxed"
                  >
                    Engineered 12 REST APIs using Node.js, reducing latency by 40% and serving 50K daily requests
                  </motion.span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <div className="h-3 bg-secondary rounded w-5/6" />
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <div className="h-3 bg-secondary rounded w-4/5" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Text Content Overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center max-w-2xl"
      >
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          Your master resume stays clean. Forever.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          When you approve a recommendation on a Base Resume, ResumeIQ automatically 
          creates a tailored copy named after the company. All future approvals for 
          that job update only the tailored copy.
        </p>
      </motion.div>

    </div>
  )
}
