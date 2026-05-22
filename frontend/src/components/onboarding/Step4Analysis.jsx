import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Plus, Edit3, Check, X } from 'lucide-react'

export default function Step4Analysis() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const sequence = async () => {
      // 0: Initial
      await new Promise(r => setTimeout(r, 400))
      // 1: Panel expanded
      setPhase(1)
      await new Promise(r => setTimeout(r, 600))
      // 2: Scores animate in
      setPhase(2)
      await new Promise(r => setTimeout(r, 800))
      // 3: Rec cards slide up
      setPhase(3)
    }
    sequence()
  }, [])

  return (
    <div className="w-full h-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      
      {/* Left: Expanded Extension Panel Mockup */}
      <div className="relative h-[600px] w-full flex justify-center items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-[400px] h-full bg-[#1c1c1e] rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-[9px]">R</span>
              </div>
              <span className="text-white font-semibold text-xs">ResumeIQ Analysis</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col p-4">
            {/* AI Analysis Result Section */}
            <div className="mb-4">
              <h3 className="text-white/80 text-[10px] font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5">
                <span className="text-amber-400">⚡</span> AI ANALYSIS RESULT
              </h3>
              
              <div className="flex gap-3 mb-4">
                {/* ATS Score */}
                <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="relative w-12 h-12 mb-1">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      {phase >= 2 && (
                        <motion.circle
                          cx="50" cy="50" r="40" fill="none"
                          stroke="#0a9d76"
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray="251.2"
                          initial={{ strokeDashoffset: 251.2 }}
                          animate={{ strokeDashoffset: 251.2 - (251.2 * 0.74) }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                      {phase >= 2 ? '74%' : '0%'}
                    </div>
                  </div>
                  <span className="text-[9px] text-white/50 font-medium uppercase tracking-wider">ATS Score</span>
                </div>

                {/* Semantic Score */}
                <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="relative w-12 h-12 mb-1">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      {phase >= 2 && (
                        <motion.circle
                          cx="50" cy="50" r="40" fill="none"
                          stroke="#0a9d76"
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray="251.2"
                          initial={{ strokeDashoffset: 251.2 }}
                          animate={{ strokeDashoffset: 251.2 - (251.2 * 0.81) }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                      {phase >= 2 ? '81%' : '0%'}
                    </div>
                  </div>
                  <span className="text-[9px] text-white/50 font-medium uppercase tracking-wider">Semantic</span>
                </div>
              </div>

              <AnimatePresence>
                {phase >= 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <span className="text-amber-400/90 text-[11px] font-medium bg-amber-400/10 px-2 py-1 rounded">
                      6 pending improvements
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recommendations List */}
            <div className="flex-1 space-y-3 relative">
              <AnimatePresence>
                {phase >= 3 && (
                  <>
                    {/* Card 1: Bullet Rewrite */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0 }}
                      className="bg-[#242426] rounded-lg border border-white/10 p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-bold text-white/80">Bullet Rewrite — Experience</span>
                      </div>
                      <div className="bg-white/5 rounded p-2 mb-2 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase font-bold mb-1">Current</p>
                        <p className="text-[11px] text-white/60 line-through">Worked on backend APIs</p>
                      </div>
                      <div className="bg-[#111] rounded p-2 mb-3 border border-primary/30">
                        <p className="text-[9px] text-primary uppercase font-bold mb-1">Suggested</p>
                        <p className="text-[11px] text-white leading-relaxed">
                          Engineered 12 REST APIs using Node.js, reducing latency by 40% and serving 50K daily requests
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-white text-black font-semibold text-[11px] py-1.5 rounded flex justify-center items-center gap-1">
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button className="flex-1 bg-white/10 text-white font-medium text-[11px] py-1.5 rounded flex justify-center items-center gap-1 hover:bg-white/20">
                          <X className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    </motion.div>

                    {/* Card 2: Add Skill */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="bg-[#242426] rounded-lg border border-white/10 p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Plus className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-white/80">Add Skill — System Design</span>
                      </div>
                      <p className="text-[11px] text-white/80">
                        Add <span className="font-mono bg-white/10 px-1 rounded">System Design</span> to your Skills section
                      </p>
                    </motion.div>

                    {/* Card 3: Summary Rewrite */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-[#242426] rounded-lg border border-white/10 p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Edit3 className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-white/80">Summary Rewrite</span>
                      </div>
                      <div className="bg-[#111] rounded p-2 border border-white/5">
                        <p className="text-[11px] text-white/60 truncate">
                          Results-driven Software Engineer with 4+ years...
                        </p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Gradient fade at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1c1c1e] to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right: Text Content */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col max-w-lg"
      >
        <h2 className="text-4xl font-bold tracking-tight text-foreground mb-6">
          AI rewrites your resume for each job
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          Gemini analyses the full job description against your resume semantically — 
          then suggests targeted rewrites for bullets, skills, and your summary.
        </p>
      </motion.div>
      
    </div>
  )
}
