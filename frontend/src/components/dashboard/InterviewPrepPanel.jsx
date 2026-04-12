import { useState } from 'react'
import { api } from '../../lib/api'
import { useToast } from '../ui/Toast'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { motion, AnimatePresence } from 'framer-motion'

const spring = { type: 'spring', stiffness: 300, damping: 30 }
const gentleSpring = { type: 'spring', stiffness: 200, damping: 24 }

export default function InterviewPrepPanel({ job, onUpdate }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState(0)

  const hasPrep = !!job?.interviewPrep?.length

  const handleGenerate = async () => {
    try {
      setLoading(true)
      const result = await api.generateInterviewPrep(job.jobId)
      if (onUpdate) onUpdate(result)
      toast.success('Interview questions generated!')
    } catch (e) {
      toast.error('Failed to generate prep: ' + e.message)
    } finally {
      setLoading(false)
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

      {/* Empty state — no prep generated yet */}
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
            onClick={handleGenerate}
            disabled={loading}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6"
          >
            {loading ? <Spinner size="sm" /> : 'Analyze & Generate Prep'}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            Questions calibrated for {currentTier.label.split(' / ')[0]} interviews.
          </p>
        </motion.div>
      ) : (

        /* Question cards list */
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
                {/* Question header row */}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    {/* Difficulty + Gap */}
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
                    {/* Question text */}
                    <p className={`text-sm leading-relaxed tracking-tight ${
                      expandedIndex === idx
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground line-clamp-2'
                    }`}>
                      {item.question}
                    </p>
                  </div>
                  {/* Chevron */}
                  <div className={`flex-shrink-0 mt-1 transition-transform duration-300 ${
                    expandedIndex === idx ? 'rotate-180' : ''
                  }`}>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded: Coached Strategic Answer */}
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

          {/* Regenerate button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : 'Regenerate Questions'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
