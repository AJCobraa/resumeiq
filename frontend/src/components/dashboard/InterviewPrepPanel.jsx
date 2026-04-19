import { useState } from 'react'
import { api } from '../../lib/api'
import { useToast } from '../ui/Toast'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { motion, AnimatePresence } from 'framer-motion'

const spring = { type: 'spring', stiffness: 300, damping: 30 }
const gentleSpring = { type: 'spring', stiffness: 200, damping: 24 }

export default function InterviewPrepPanel({ job, onUpdate, hasEmbeddingsCache }) {
  const toast = useToast()
  const [status, setStatus] = useState('idle') // idle | confirming | loading
  const [loadingMode, setLoadingMode] = useState(null) // 'fresh' | 'more'
  const [expandedIndex, setExpandedIndex] = useState(0)

  const hasPrep = !!job?.interviewPrep?.length
  const resumeVersionMismatch = hasPrep && job.interviewPrepResumeId !== job.resumeId

  const handleGenerate = async (mode = 'fresh') => {
    try {
      setStatus('loading')
      setLoadingMode(mode)
      const result = await api.generateInterviewPrep(job.jobId, mode)
      if (onUpdate) onUpdate(result)
      toast.success(mode === 'more' ? 'More questions added!' : 'Interview questions generated!')
      setStatus('idle')
    } catch (e) {
      toast.error('Failed to generate prep: ' + e.message)
      setStatus('idle')
    } finally {
      setLoadingMode(null)
    }
  }

  const tier = job?.interviewPrepTier || 'standard'
  const tierConfig = {
    faang: {
      label: job?.interviewPrepTierLabel || 'FAANG / Big Tech',
      badgeClass: 'bg-destructive/10 text-destructive border border-destructive/20',
    },
    unicorn: {
      label: job?.interviewPrepTierLabel || 'Unicorn / Large Tech',
      badgeClass: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
    },
    standard: {
      label: job?.interviewPrepTierLabel || 'Tech Company',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
    },
  }
  const currentTier = tierConfig[tier] || tierConfig.standard

  const difficultyColors = {
    hard: 'bg-destructive/10 text-destructive',
    medium: 'bg-orange-500/10 text-orange-500',
    easy: 'bg-emerald-500/10 text-emerald-600',
  }

  return (
    <div className="space-y-4">
      {/* ── Cache Status Banner ── */}
      <AnimatePresence>
        {(!hasEmbeddingsCache || resumeVersionMismatch) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-3 rounded-xl border mb-2 flex items-start gap-3 ${
              !hasEmbeddingsCache 
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-600'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
            }`}>
              <div className="mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold">
                  {!hasEmbeddingsCache 
                    ? 'Resume Changes Detected' 
                    : 'Generated for Previous Version'}
                </p>
                <p className="text-[10px] opacity-80 leading-tight mt-0.5">
                  {!hasEmbeddingsCache 
                    ? 'You updated your resume since last calibration. Re-generate to align with your new skill set.'
                    : 'These questions were based on an older version of your resume.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Interview Predictor (Beta)
        </p>
        {hasPrep && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${currentTier.badgeClass}`}>
            {currentTier.label} Bar
          </span>
        )}
      </div>

      {/* ── Empty State ── */}
      {!hasPrep ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={gentleSpring}
          className="bg-card rounded-xl border border-dashed border-border/60 flex flex-col items-center py-10 text-center"
        >
          <div className="text-4xl mb-3">🎯</div>
          <h4 className="font-semibold tracking-tight text-foreground mb-1 text-sm">
            Predict likely interview questions
          </h4>
          <p className="text-xs text-muted-foreground max-w-xs mb-5 leading-relaxed">
            We'll analyze {job.company}'s interview culture and your resume gaps
            to predict exactly what they'll ask.
          </p>
          <Button
            size="sm"
            onClick={() => handleGenerate('fresh')}
            disabled={status === 'loading'}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6"
          >
            {status === 'loading' ? <Spinner size="sm" /> : 'Analyze & Generate Prep'}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            Questions calibrated for {currentTier.label.split(' / ')[0]} interviews.
          </p>
        </motion.div>
      ) : (

        /* ── Question List ── */
        <div className="space-y-2.5">
          {job.interviewPrep.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...gentleSpring, delay: idx * 0.06 }}
            >
              <div
                className={`bg-card rounded-xl border shadow-soft transition-all duration-200 cursor-pointer ${
                  expandedIndex === idx
                    ? 'border-border/60 ring-1 ring-foreground/10'
                    : 'border-border/40 hover:border-border/60'
                }`}
                onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        difficultyColors[item.difficulty?.toLowerCase()] || 'bg-secondary text-muted-foreground'
                      }`}>
                        {item.difficulty}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        Gap: {item.gap}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed tracking-tight ${
                      expandedIndex === idx ? 'text-foreground font-medium' : 'text-muted-foreground line-clamp-2'
                    }`}>
                      {item.question}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 mt-1 transition-transform duration-300 ${expandedIndex === idx ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={gentleSpring}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0">
                        <div className="border-t border-border/40 pt-4">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                            Coached Strategic Answer
                          </p>
                          <p className="text-xs text-foreground leading-relaxed italic bg-secondary/60 p-3.5 rounded-xl border border-border/40 border-l-2 border-l-foreground/20">
                            "{item.strategicAnswer}"
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}

          {/* ── Actions Row ── */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleGenerate('more')}
              disabled={status === 'loading'}
              className="text-xs font-semibold text-foreground flex items-center gap-1.5 hover:opacity-80 disabled:opacity-50 transition-all"
            >
              {loadingMode === 'more' ? <Spinner size="sm" /> : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Give Me More
                </>
              )}
            </button>
            <div className="h-3 w-px bg-border/40" />
            <button
              onClick={() => setStatus('confirming')}
              disabled={status === 'loading'}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {loadingMode === 'fresh' ? <Spinner size="sm" /> : 'Start Fresh'}
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      <AnimatePresence>
        {status === 'confirming' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setStatus('idle')}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-card w-full max-w-xs rounded-2xl border border-border/60 shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-500/10 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold mb-1">Regenerate Interview Prep?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will wipe all current questions and generate 3 new ones from scratch.
                </p>
              </div>
              <div className="flex border-t border-border/40">
                <button 
                  onClick={() => setStatus('idle')}
                  className="flex-1 px-4 py-3 text-xs font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleGenerate('fresh')}
                  className="flex-1 px-4 py-3 text-xs font-bold text-destructive hover:bg-destructive/5 border-l border-border/40 transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
