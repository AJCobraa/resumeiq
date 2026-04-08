import { useState } from 'react'
import { api } from '../../lib/api'
import { useToast } from '../ui/Toast'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import Badge from '../ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'

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
      color: 'bg-red/10 text-red border-red/20',
      description: 'Expert-level depth focused on scale and system internals.'
    },
    unicorn: {
      label: job?.interviewPrepTierLabel || 'Unicorn / Large Tech',
      color: 'bg-orange/10 text-orange border-orange/20',
      description: 'Senior-level bar focused on delivery and cross-functional impact.'
    },
    standard: {
      label: job?.interviewPrepTierLabel || 'Tech Company',
      color: 'bg-green/10 text-green border-green/20',
      description: 'Mid-level bar focused on practical skills and problem solving.'
    }
  }

  const currentTier = tierConfig[tier] || tierConfig.standard

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Interview Predictor (Beta)
        </h3>
        {hasPrep && (
          <Badge variant="outline" className={currentTier.color}>
            {currentTier.label} Bar
          </Badge>
        )}
      </div>

      {!hasPrep ? (
        <Card className="bg-bg-elevated/30 border-dashed border-border-default flex flex-col items-center py-8 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <h4 className="font-semibold mb-1">Predict likely interview questions</h4>
          <p className="text-xs text-text-muted max-w-xs mb-4">
            We'll analyze {job.company}'s interview culture and your resume gaps 
            to predict exactly what they'll ask.
          </p>
          <Button 
            size="sm" 
            onClick={handleGenerate} 
            disabled={loading}
            className="bg-accent-blue hover:bg-accent-blue/90"
          >
            {loading ? <Spinner size="sm" /> : 'Analyze & Generate Prep'}
          </Button>
          <p className="text-[10px] text-text-muted mt-3 italic">
            Questions calibrated for {currentTier.label.split(' / ')[0]} interviews.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {job.interviewPrep.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card 
                className={`transition-all duration-300 ${expandedIndex === idx ? 'ring-1 ring-accent-blue/30 bg-bg-elevated/50' : 'cursor-pointer hover:bg-bg-elevated/30'}`}
                onClick={() => setExpandedIndex(idx)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-1.5 py-0.5 rounded bg-bg-secondary text-[10px] font-bold text-text-muted uppercase">
                        {item.difficulty}
                      </span>
                      <span className="text-[10px] text-text-muted truncate max-w-[150px]">
                        Gap: {item.gap}
                      </span>
                    </div>
                    <p className={`text-sm font-medium leading-relaxed ${expandedIndex === idx ? 'text-text-primary' : 'text-text-muted line-clamp-1'}`}>
                      {item.question}
                    </p>
                  </div>
                  <div className={`mt-1 transition-transform duration-300 ${expandedIndex === idx ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-border-default/50 space-y-3">
                        <div>
                          <p className="text-[10px] text-accent-blue font-bold uppercase mb-1 tracking-tight">Coached Strategic Answer</p>
                          <p className="text-xs text-text-primary leading-relaxed italic bg-accent-blue/5 p-3 rounded border-l-2 border-accent-blue">
                            "{item.strategicAnswer}"
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}

          <div className="flex justify-center pt-2">
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={handleGenerate} 
              disabled={loading}
              className="text-text-muted hover:text-accent-blue text-[10px]"
            >
              {loading ? <Spinner size="sm" /> : 'Regenerate Questions'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
