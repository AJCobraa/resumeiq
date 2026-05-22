import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ChevronDown, FileText, Search } from 'lucide-react'

export default function Step3Extension() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const sequence = async () => {
      // 0: Initial
      await new Promise(r => setTimeout(r, 400))
      // 1: Job visible
      setPhase(1)
      await new Promise(r => setTimeout(r, 600))
      // 2: Extension slides in
      setPhase(2)
      await new Promise(r => setTimeout(r, 1000))
      // 3: Button pulse
      setPhase(3)
    }
    sequence()
  }, [])

  return (
    <div className="w-full h-full max-w-6xl mx-auto px-6 flex flex-col items-center justify-center">
      
      {/* Browser Mockup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-[#111] rounded-t-2xl rounded-b-lg border border-border/20 shadow-2xl overflow-hidden relative mb-12"
      >
        {/* Browser Top Bar */}
        <div className="h-10 bg-[#1a1a1a] border-b border-white/10 flex items-center px-4 gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex-1 bg-[#222] rounded-md h-6 flex items-center px-3 text-[11px] text-white/50 font-mono gap-2 max-w-lg mx-auto">
            <Search className="w-3 h-3" />
            linkedin.com/jobs/view/software-engineer-google-123456
          </div>
        </div>

        {/* Browser Content */}
        <div className="h-[400px] bg-[#0a0a0a] relative overflow-hidden flex">
          
          {/* Main Job Content */}
          <div className="flex-1 p-10">
            <AnimatePresence>
              {phase >= 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-2xl"
                >
                  <h1 className="text-3xl font-bold text-white mb-2">Software Engineer</h1>
                  <p className="text-white/60 mb-8">
                    Google • Bangalore, IN • <span className="text-emerald-400/80">Posted 2 days ago</span>
                  </p>
                  
                  <div className="space-y-4 text-white/70 text-sm leading-relaxed">
                    <p>
                      We are looking for a passionate Software Engineer to design and build scalable backend systems.
                      You will work closely with cross-functional teams to deliver high-quality software.
                    </p>
                    <p>
                      Ideal candidates will have strong experience with <span className="text-white bg-white/10 px-1 rounded">React</span>, <span className="text-white bg-white/10 px-1 rounded">Node.js</span>, and container orchestration using <span className="text-white bg-white/10 px-1 rounded">Kubernetes</span>.
                      Deep knowledge of <span className="text-white bg-white/10 px-1 rounded">System Design</span>, <span className="text-white bg-white/10 px-1 rounded">Go</span>, and <span className="text-white bg-white/10 px-1 rounded">gRPC</span> is highly preferred.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Extension Card sliding in */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="w-[340px] h-full bg-[#1c1c1e] border-l border-white/10 p-5 flex flex-col shadow-2xl relative z-10"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-[10px]">R</span>
                    </div>
                    <span className="text-white font-semibold text-sm">ResumeIQ</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-md cursor-pointer">
                    <FileText className="w-3 h-3 text-white/70" />
                    <span className="text-white/70 text-[10px] font-medium">My_Resume.pdf</span>
                    <ChevronDown className="w-3 h-3 text-white/50" />
                  </div>
                </div>

                {/* Score Ring Section */}
                <div className="flex items-center gap-5 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      <motion.circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="#b35900" /* Orange */
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray="251.2"
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 251.2 - (251.2 * 0.67) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                      67%
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm mb-0.5">Fair Match</h4>
                    <p className="text-white/50 text-[11px]">You have some key requirements, but are missing others.</p>
                  </div>
                </div>

                {/* Keywords */}
                <div className="mb-6 flex-1">
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-2">Keyword Analysis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['React', 'Node.js', 'Kubernetes'].map(kw => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded">
                        <Check className="w-3 h-3" /> {kw}
                      </span>
                    ))}
                    {['System Design', 'Go', 'gRPC'].map(kw => (
                      <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-medium rounded">
                        <X className="w-3 h-3" /> {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <motion.button
                  animate={phase >= 3 ? {
                    boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 20px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)']
                  } : {}}
                  transition={{ duration: 1, repeat: phase >= 3 ? Infinity : 0, repeatDelay: 2 }}
                  className="w-full bg-primary text-white text-xs font-bold py-3 rounded-lg shadow-lg relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Deep AI Analysis
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center max-w-2xl"
      >
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          See your match score on any job
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          The Chrome Extension injects a live match card on LinkedIn, Naukri, Indeed, 
          and Internshala — showing exactly which keywords you match and which you're missing.
        </p>
      </motion.div>
    </div>
  )
}
