import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { formatDate, getScoreColor, getPortalInfo, truncate } from '../lib/utils'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'

const STATUS_OPTIONS = [
  { value: 'analyzed', label: 'Analyzed', color: 'blue' },
  { value: 'applied', label: 'Applied', color: 'purple' },
  { value: 'interview', label: 'Interview', color: 'orange' },
  { value: 'offer', label: 'Offer', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
]

export default function Dashboard() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [analysisTarget, setAnalysisTarget] = useState(null)
  const [showExtensionGuide, setShowExtensionGuide] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDetail, setJobDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getJobs()
      setJobs(data)
    } catch {
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const openJobDetail = async (jobId) => {
    try {
      setDetailLoading(true)
      setSelectedJob(jobId)
      const detail = await api.getJob(jobId)
      setJobDetail(detail)
    } catch {
      toast.error('Failed to load job details')
      setSelectedJob(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await api.updateJobStatus(jobId, { status: newStatus })
      setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, status: newStatus } : j))
      if (jobDetail?.jobId === jobId) {
        setJobDetail(prev => ({ ...prev, status: newStatus }))
      }
      toast.success(`Status updated to ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleRecommendation = async (jobId, recId, action, editedText = '') => {
    try {
      await api.approveRecommendation(jobId, {
        recommendationId: recId, action, editedText,
      })

      // Re-fetch the full job detail so recommendation states are always in sync with Firestore.
      // This is critical after an approve: the backend runs a background task to update the resume
      // bullet, and we want the UI to reflect the persisted state (not a local guess).
      const refreshed = await api.getJob(jobId)
      if (refreshed) {
        setJobDetail(refreshed)
      }

      toast.success(
        action === 'approve' ? 'Recommendation applied to resume!' :
        action === 'dismiss' ? 'Recommendation dismissed' : 'Recommendation updated'
      )
    } catch {
      toast.error('Failed to update recommendation')
    }
  }

  const handleReanalyze = async (job) => {
    try {
      setIsReanalyzing(true)
      const result = await api.analyze({
        resumeId: job.resumeId,
        jdText: job.jdText,
        jdUrl: job.jdUrl,
        jobTitle: job.jobTitle,
        company: job.company,
        portal: job.portal,
        jobId: job.jobId
      })
      toast.success('Resume re-analyzed successfully!')
      // Refresh the modal detail
      setJobDetail(result)
      // Also update the job in the main table list for sync
      setJobs(prev => prev.map(j => j.jobId === result.jobId ? result : j))
    } catch (e) {
      toast.error('Analysis failed: ' + e.message)
    } finally {
      setIsReanalyzing(false)
    }
  }

  const handleDeleteJob = async (jobId) => {
    try {
      await api.deleteJob(jobId)
      setJobs(prev => prev.filter(j => j.jobId !== jobId))
      if (selectedJob === jobId) {
        setSelectedJob(null)
        setJobDetail(null)
      }
      toast.success('Job analysis deleted')
    } catch {
      toast.error('Failed to delete job')
    }
  }

  // Compute stats
  const avgScore = jobs.length > 0
    ? Math.round(jobs.reduce((sum, j) => sum + (j.atsScore || 0), 0) / jobs.length)
    : 0
  const interviewCount = jobs.filter(j => j.status === 'interview' || j.status === 'offer').length
  const approvedCount = jobs.reduce((sum, j) => sum + (j.approvedCount || 0), 0)

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-text-muted mt-1">Track your job applications and ATS scores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Jobs Tracked', value: jobs.length, icon: '📋' },
          { label: 'Avg ATS Score', value: jobs.length > 0 ? `${avgScore}%` : '—', icon: '📊' },
          { label: 'Interviews', value: interviewCount, icon: '🎯' },
          { label: 'Approved Fixes', value: approvedCount, icon: '✅' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-2xl font-bold font-mono">{stat.value}</p>
                  <p className="text-xs text-text-muted">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Extension Install Guide Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8 p-5 rounded-lg border border-accent-blue/30 bg-accent-blue/5 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div>
          <h3 className="font-semibold text-accent-blue text-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Enable ATS Matching
          </h3>
          <p className="text-text-muted text-sm mt-1">
            Install the ResumeIQ Chrome Extension to extract jobs directly from LinkedIn, Indeed, and Naukri.
          </p>
        </div>
        <Button onClick={() => setShowExtensionGuide(true)} className="whitespace-nowrap">
          How to Install
        </Button>
      </motion.div>

      {/* Jobs Table or Empty State */}
      {jobs.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold mb-2">No jobs analyzed yet</h2>
          <p className="text-text-muted text-sm max-w-md mx-auto">
            Install the Chrome Extension and open a job listing on LinkedIn,
            Naukri, Indeed, or Internshala to get started.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Job</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Portal</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">ATS Score</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">Fixes</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const portal = getPortalInfo(job.portal)
                const statusInfo = STATUS_OPTIONS.find(s => s.value === job.status) || STATUS_OPTIONS[0]
                return (
                  <tr
                    key={job.jobId}
                    className="border-b border-border-default/50 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                    onClick={() => openJobDetail(job.jobId)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{job.jobTitle || 'Untitled'}</p>
                      <p className="text-xs text-text-muted">{job.company}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={portal.color}>{portal.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold font-mono ${getScoreColor(job.atsScore)}`}>
                        {job.atsScore}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span className="text-text-muted">{job.approvedCount}/{job.recommendationCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.color}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.jobId) }}
                        className="text-text-muted hover:text-red text-xs cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Job Detail Modal */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => { setSelectedJob(null); setJobDetail(null) }}
        title={jobDetail?.jobTitle || 'Job Analysis'}
        size="lg"
      >
        {detailLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : jobDetail ? (
          <JobDetailPanel
            job={jobDetail}
            onStatusChange={(status) => handleStatusChange(jobDetail.jobId, status)}
            onRecommendation={(recId, action, text) => handleRecommendation(jobDetail.jobId, recId, action, text)}
            onReanalyze={() => handleReanalyze(jobDetail)}
            isReanalyzing={isReanalyzing}
          />
        ) : null}
      </Modal>

      {/* Extension Guide Modal */}
      <Modal isOpen={showExtensionGuide} onClose={() => setShowExtensionGuide(false)} title="Install Chrome Extension">
        <div className="space-y-4 text-sm text-text-primary">
          <p>The ResumeIQ extension analyzes job listings straight from your browser. Because it's a developer tool currently, you will need to load it locally.</p>
          
          <div className="bg-bg-elevated p-4 rounded-md border border-border-default space-y-3">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center font-bold">1</span>
              <p>Open Google Chrome and navigate to <span className="font-mono bg-bg-secondary px-1.5 py-0.5 rounded text-xs select-all">chrome://extensions/</span></p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center font-bold">2</span>
              <p>Toggle <strong>"Developer mode"</strong> in the top right corner.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center font-bold">3</span>
              <p>Click <strong>"Load unpacked"</strong> and select the <span className="font-mono bg-bg-secondary px-1.5 py-0.5 rounded text-xs">/extension</span> directory from this project folder.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center font-bold">4</span>
              <p>Pin the extension to your toolbar. Go to a job listing on LinkedIn and click it!</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowExtensionGuide(false)}>Got it!</Button>
          </div>
        </div>
      </Modal>

    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────
   Job Detail Panel (inside modal)
   ────────────────────────────────────────────────────── */
function JobDetailPanel({ job, onStatusChange, onRecommendation, onReanalyze, isReanalyzing }) {
  const showDebug = import.meta.env.DEV && job?.debug

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{job.company} • {getPortalInfo(job.portal).label}</p>
          {job.jdUrl && (
            <a href={job.jdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-blue hover:underline">
              View original listing →
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={onReanalyze} 
            disabled={isReanalyzing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-accent-blue text-accent-blue hover:bg-accent-blue/10"
          >
            {isReanalyzing ? <Spinner size="sm" /> : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-Analyze
              </>
            )}
          </Button>
          <select
            value={job.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-1.5 text-xs bg-bg-elevated border border-border-default rounded text-text-primary cursor-pointer"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-text-muted mb-1">ATS Score</p>
          <p className={`text-3xl font-bold font-mono ${getScoreColor(job.atsScore)}`}>
            {job.atsScore}%
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted mb-1">Semantic Match</p>
          <p className={`text-3xl font-bold font-mono ${getScoreColor(job.semanticScore)}`}>
            {job.semanticScore || 0}%
          </p>
        </Card>
      </div>

      {/* Dev-only cache diagnostics */}
      {showDebug && (
        <Card>
          <p className="text-xs font-semibold text-text-muted uppercase mb-2">Debug Cache Diagnostics</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-text-muted">Cache Source</span>
            <span className="font-mono">{job.debug.cacheLookupSource || 'none'}</span>

            <span className="text-text-muted">Resolved Job ID</span>
            <span className="font-mono break-all">{job.debug.resolvedJobId || job.jobId}</span>

            <span className="text-text-muted">Matched Existing</span>
            <span className="font-mono">{String(!!job.debug.matchedExistingJob)}</span>

            <span className="text-text-muted">Has JD Cache</span>
            <span className="font-mono">{String(!!job.debug.hasJdEmbeddingsCache)}</span>

            <span className="text-text-muted">JD Embedding Computed</span>
            <span className="font-mono">{String(!!job.debug.jdEmbeddingComputed)}</span>

            <span className="text-text-muted">Resume Embeddings On-Demand</span>
            <span className="font-mono">{String(!!job.debug.resumeEmbeddingsComputedOnDemand)}</span>
          </div>
        </Card>
      )}

      {/* Breakdown */}
      {job.breakdown && (
        <Card>
          <p className="text-xs font-semibold text-text-muted uppercase mb-3">Score Breakdown</p>
          <div className="space-y-2">
            {Object.entries(job.breakdown).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-accent-blue rounded-full" style={{ width: `${val}%` }} />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{val}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Missing Keywords */}
      {job.missingKeywords?.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-text-muted uppercase mb-2">Missing Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {job.missingKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-red/10 text-red rounded">
                {kw}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {job.recommendations?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase mb-3">
            Recommendations ({job.recommendations.length})
          </p>
          <div className="space-y-3">
            {job.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.recommendationId}
                rec={rec}
                onAction={(action, text) => onRecommendation(rec.recommendationId, action, text)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec, onAction }) {
  const impactColors = { high: 'text-red', medium: 'text-orange', low: 'text-text-muted' }
  const isResolved = rec.status === 'approved' || rec.status === 'dismissed'

  return (
    <Card className={`${isResolved ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${impactColors[rec.impact] || ''}`}>
            {rec.impact?.toUpperCase()} IMPACT
          </span>
          <Badge variant="outline" className="text-[10px]">{rec.type?.replace('_', ' ')}</Badge>
        </div>
        {rec.status !== 'pending' && (
          <Badge variant={rec.status === 'approved' ? 'green' : 'default'}>
            {rec.status}
          </Badge>
        )}
      </div>

      {rec.currentText && (
        <div className="mb-2">
          <p className="text-[10px] text-text-muted uppercase mb-0.5">Current</p>
          <p className="text-xs text-text-muted line-through">{rec.currentText}</p>
        </div>
      )}

      <div className="mb-2">
        <p className="text-[10px] text-text-muted uppercase mb-0.5">Suggested</p>
        <p className="text-sm text-accent-blue">{rec.suggestedText}</p>
      </div>

      <p className="text-xs text-text-muted mb-3">{rec.reason}</p>

      {rec.status === 'pending' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onAction('approve')}>Approve</Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('dismiss')}>Dismiss</Button>
        </div>
      )}
    </Card>
  )
}
