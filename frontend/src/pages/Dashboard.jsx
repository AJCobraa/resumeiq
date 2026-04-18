import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { formatDate, getScoreColor, getPortalInfo, truncate } from '../lib/utils'
import InterviewPrepPanel from '../components/dashboard/InterviewPrepPanel'

/* UI Components — Assume these exist in the paths above */
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'

const STATUS_OPTIONS = [
  { value: 'analyzed', label: 'Analyzed', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'applied', label: 'Applied', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { value: 'interview', label: 'Interview', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { value: 'offer', label: 'Offer', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { value: 'rejected', label: 'Rejected', color: 'bg-destructive/10 text-destructive border-destructive/20' },
]

const spring = { type: 'spring', stiffness: 300, damping: 30 }
const gentleSpring = { type: 'spring', stiffness: 200, damping: 24 }

export default function Dashboard() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDetail, setJobDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [showExtensionGuide, setShowExtensionGuide] = useState(false)
  const [resumes, setResumes] = useState([])

  const fetchResumes = useCallback(async () => {
    try {
      const data = await api.getResumes()
      setResumes(data)
    } catch {
      console.error('Failed to load resumes for picker')
    }
  }, [])

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
  }, [])

  useEffect(() => { 
    fetchJobs()
    fetchResumes()
  }, [])

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
      const refreshed = await api.getJob(jobId)
      if (refreshed) {
        setJobDetail(refreshed)
        setJobs(prev => prev.map(j => j.jobId === jobId ? refreshed : j))
      }
      toast.success(action === 'approve' ? 'Applied to resume!' : 'Recommendation updated')

      // Pulse the View Resume button to hint user to check the resume
      if (action === 'approve') {
        const btn = document.getElementById('view-resume-btn')
        if (btn) {
          btn.classList.add('animate-pulse-glow')
          setTimeout(() => btn.classList.remove('animate-pulse-glow'), 800)
        }
      }
    } catch {
      toast.error('Failed to update recommendation')
    }
  }

  const handleReanalyze = async (jobOrEvent) => {
    // Guard: if a DOM Event was passed instead of a job object, use current jobDetail
    const job = (jobOrEvent && typeof jobOrEvent === 'object' && jobOrEvent.resumeId)
      ? jobOrEvent
      : jobDetail

    if (!job) return

    try {
      setIsReanalyzing(true)
      const result = await api.analyze({
        resumeId: job.resumeId,
        jdText: job.jdText,
        jdUrl: job.jdUrl,
        jobTitle: job.jobTitle,
        company: job.company,
        portal: job.portal,
        jobId: job.jobId,
      })
      toast.success('Resume re-analyzed!')
      setJobDetail(result)
      setJobs(prev => prev.map(j => j.jobId === result.jobId ? result : j))
    } catch (e) {
      toast.error('Analysis failed: ' + e.message)
    } finally {
      setIsReanalyzing(false)
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return
    try {
      await api.deleteJob(jobId)
      setJobs(prev => prev.filter(j => j.jobId !== jobId))
      if (selectedJob === jobId) {
        setSelectedJob(null)
        setJobDetail(null)
      }
      toast.success('Job deleted')
    } catch {
      toast.error('Failed to delete job')
    }
  }

  // Stats computation
  const avgScore = jobs.length > 0
    ? Math.round(jobs.reduce((sum, j) => sum + (j.atsScore || 0), 0) / jobs.length)
    : 0
  const interviewCount = jobs.filter(j => ['interview', 'offer'].includes(j.status)).length
  const totalFixes = jobs.reduce((sum, j) => sum + (j.approvedCount || 0), 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fcfcfd]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcfcfd] p-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Applications</h1>
            <p className="text-slate-500 mt-1.5">Manage job matches and optimize your resume.</p>
          </div>
          <Button onClick={() => setShowExtensionGuide(true)} variant="outline" size="sm" className="gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Extension Active
          </Button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Jobs', value: jobs.length, sub: 'Analyzed', icon: '📋' },
            { label: 'Avg Match', value: `${avgScore}%`, sub: 'Across all', icon: '🎯' },
            { label: 'Interviews', value: interviewCount, sub: 'Next stage', icon: '🤝' },
            { label: 'Applied Fixes', value: totalFixes, sub: 'Bullet edits', icon: '✨' },
          ].map((stat, i) => (
            <Card key={i} className="hover:shadow-glow transition-shadow duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {jobs.length === 0 ? (
          <EmptyState onShowGuide={() => setShowExtensionGuide(true)} />
        ) : (
          <Card className="overflow-hidden p-0 border-slate-200/60 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Score</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const portal = getPortalInfo(job.portal)
                    const statusInfo = STATUS_OPTIONS.find(s => s.value === job.status) || STATUS_OPTIONS[0]
                    return (
                      <tr 
                        key={job.jobId} 
                        onClick={() => openJobDetail(job.jobId)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-10 rounded-full ${getScoreColor(job.atsScore).replace('text-', 'bg-')}/20`} />
                            <div>
                              <p className="font-semibold text-slate-900 leading-none mb-1">{job.jobTitle || 'Unstructured Job'}</p>
                              <p className="text-sm text-slate-500 flex items-center gap-2">
                                {job.company} 
                                <span className="w-1 h-1 rounded-full bg-slate-300" /> 
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${portal.color}`}>
                                  {portal.label}
                                </span>
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {job.resumeTitle && job.resumeTitle !== '__deleted__'
                                  ? job.resumeTitle
                                  : job.resumeTitle === '__deleted__'
                                    ? <span className="italic text-orange-300">Resume deleted</span>
                                    : <span className="italic text-slate-300">—</span>
                                }
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-lg font-bold tabular-nums ${getScoreColor(job.atsScore)}`}>
                            {job.atsScore}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusInfo.color} className="capitalize">{statusInfo.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {formatDate(job.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.jobId) }}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Modal 
          isOpen={!!selectedJob} 
          onClose={() => { setSelectedJob(null); setJobDetail(null) }}
          title={jobDetail?.jobTitle || 'Job Analysis'}
          size="lg"
          headerAction={
            jobDetail?.jdUrl ? (
              <a
                href={jobDetail.jdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-border/50 text-muted-foreground bg-secondary hover:bg-secondary/80 hover:border-border hover:text-foreground transition-all duration-200"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Listing
              </a>
            ) : null
          }
          headerEnd={
            jobDetail?.resumeTitle && jobDetail.resumeTitle !== '__deleted__' && jobDetail.resumeId ? (
              <a
                href={`/resumes/${jobDetail.resumeId}`}
                target="_blank"
                rel="noopener noreferrer"
                id="view-resume-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/50 hover:shadow-sm hover:shadow-primary/20 transition-all duration-200"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Resume
              </a>
            ) : null
          }
          headerMeta={jobDetail ? (() => {
            const portal = getPortalInfo(jobDetail.portal)
            return (
              <div className="flex flex-col gap-1">
                {/* Company + portal */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-700">{jobDetail.company}</span>
                  {portal.label && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${portal.color}`}>
                      {portal.label}
                    </span>
                  )}
                </div>
                {/* Resume name */}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {jobDetail.resumeTitle && jobDetail.resumeTitle !== '__deleted__'
                    ? <span className="font-medium text-foreground">{jobDetail.resumeTitle}</span>
                    : jobDetail.resumeTitle === '__deleted__'
                      ? <span className="italic text-orange-400">Resume deleted</span>
                      : <span className="italic text-muted-foreground">Original Resume</span>
                  }
                </p>
              </div>
            )
          })() : null}
        >
          {detailLoading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : jobDetail ? (
            <JobDetailPanel 
              job={jobDetail}
              resumes={resumes}
              onStatusChange={(s) => handleStatusChange(jobDetail.jobId, s)}
              onRecommendation={(id, a, t) => handleRecommendation(jobDetail.jobId, id, a, t)}
              onReanalyze={(jobObj) => handleReanalyze(jobObj || jobDetail)}
              onPrepUpdate={(prepResult) => setJobDetail(prev => ({ ...prev, ...prepResult }))}
              isReanalyzing={isReanalyzing}
            />
          ) : null}
        </Modal>

        <ExtensionGuide isOpen={showExtensionGuide} onClose={() => setShowExtensionGuide(false)} />
      </motion.div>
    </div>
  )
}

function EmptyState({ onShowGuide }) {
  return (
    <Card className="border-dashed border-2 border-slate-200 py-20 text-center bg-slate-50/30">
      <div className="text-5xl mb-6">🚀</div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Ready to land your next role?</h2>
      <p className="text-slate-500 max-w-md mx-auto mb-8 text-balance">
        Install the ResumeIQ extension to analyze job listings directly on LinkedIn, Indeed, and more.
      </p>
      <Button onClick={onShowGuide} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
        Get Started
      </Button>
    </Card>
  )
}

function ScoreRing({ score, label, color }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = ((score || 0) / 100) * circumference
  const gap = circumference - progress

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-secondary"
          />
          {/* Progress ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${gap}`}
            className={color}
          />
        </svg>
        {/* Score text centered inside ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold font-mono tracking-tighter ${color}`}>
            {score || 0}%
          </span>
        </div>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
        {label}
      </p>
    </div>
  )
}

function JobDetailPanel({ job, resumes, onStatusChange, onRecommendation, onReanalyze, onPrepUpdate, isReanalyzing }) {
  const showDebug = import.meta.env.DEV && job?.debug
  const [activeTab, setActiveTab] = useState('score')

  const portal = getPortalInfo(job.portal)
  const pendingRecs = job.recommendations?.filter(r => r.status === 'pending').length || 0

  const resumeExists = resumes.some(r => r.resumeId === job.resumeId)

  return (
    <div className="flex flex-col">

      {/* ── Actions row ── */}
      <div className="flex justify-end items-center gap-2 mb-5 flex-shrink-0">
        {job.resumeTitle === '__deleted__' ? (
          <ResumePickerReanalyze job={job} onReanalyze={onReanalyze} isReanalyzing={isReanalyzing} />
        ) : (
          <Button
            onClick={() => onReanalyze(job)}
            disabled={isReanalyzing}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-full border-border/60 text-foreground text-xs px-3"
          >
            {isReanalyzing ? (
              <Spinner size="sm" />
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-Analyze
              </>
            )}
          </Button>
        )}
        <select
          value={job.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-1.5 text-xs bg-secondary border border-border/40 rounded-xl text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>


      {/* ── Score Rings ── */}
      <div className="bg-secondary/30 rounded-2xl border border-border/40 p-6 mb-5 flex-shrink-0">
        <div className="flex items-center justify-center gap-12 py-4">
          <ScoreRing 
            key={`ats-${job.atsScore}`}
            score={job.atsScore} 
            label="ATS Keyword Score" 
            color={getScoreColor(job.atsScore)} 
          />
          <ScoreRing 
            key={`sem-${job.semanticScore}`}
            score={job.semanticScore || 0} 
            label="Semantic Match" 
            color={getScoreColor(job.semanticScore)} 
          />
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex justify-center mb-5 flex-shrink-0">
        <div className="bg-secondary rounded-full p-1 inline-flex gap-1">
          {[
            { id: 'score', label: 'Score Details' },
            { id: 'recs', label: `AI Recommendations${pendingRecs > 0 ? ` (${pendingRecs})` : ''}` },
            { id: 'interview', label: 'Interview Coach' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Tab Content ── */}
      <div className="space-y-4">

        {/* ════ TAB: Score Details ════ */}
        {activeTab === 'score' && (
          <div className="space-y-4">

            {/* Score Breakdown bars */}
            {job.breakdown && (
              <div className="bg-card rounded-xl border border-border/60 p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Score Breakdown
                </p>
                <div className="space-y-3">
                  {Object.entries(job.breakdown).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-foreground capitalize flex-shrink-0">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <div className="w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            transition={{ ...gentleSpring, delay: 0.1 }}
                            className="h-full bg-foreground rounded-full"
                          />
                        </div>
                        <span className="text-xs font-mono font-bold w-9 text-right text-foreground">
                          {val}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Keywords */}
            {job.strongMatches?.length > 0 && (
              <div className="bg-card rounded-xl border border-border/60 p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Matched Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.strongMatches.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full"
                    >
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Keywords */}
            {job.missingKeywords?.length > 0 && (
              <div className="bg-card rounded-xl border border-border/60 p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Missing Keywords
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.missingKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded-full"
                    >
                      ✕ {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Semantic JD Match — line by line */}
            {job.semanticDetails?.length > 0 && (
              <div className="bg-card rounded-xl border border-border/60 p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Semantic JD Match (Line by Line)
                </p>
                <div className="space-y-2">
                  {job.semanticDetails.map((detail, i) => {
                    let rowColor = 'border-border/30 bg-background'
                    let badgeColor = 'bg-secondary text-muted-foreground'
                    let textColor = 'text-muted-foreground'
                    if (detail.score >= 65) {
                      rowColor = 'border-emerald-200 bg-emerald-50/40'
                      badgeColor = 'bg-emerald-100 text-emerald-600'
                      textColor = 'text-emerald-700'
                    } else if (detail.score >= 40) {
                      rowColor = 'border-orange-200 bg-orange-50/40'
                      badgeColor = 'bg-orange-100 text-orange-500'
                      textColor = 'text-orange-600'
                    } else {
                      rowColor = 'border-red-200 bg-red-50/40'
                      badgeColor = 'bg-red-100 text-destructive'
                      textColor = 'text-destructive'
                    }
                    return (
                      <div key={i} className={`text-xs p-3 rounded-xl border ${rowColor} flex gap-3 items-start`}>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${badgeColor} shrink-0 font-mono`}>
                          {detail.score}%
                        </span>
                        <span className={`leading-snug ${textColor}`}>{detail.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dev-only debug diagnostics */}
            {showDebug && (
              <div className="bg-secondary/40 rounded-xl border border-border/40 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest">
                  Debug Cache Diagnostics
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
                  <span className="text-muted-foreground">Cache Source</span>
                  <span className="text-foreground">{job.debug.cacheLookupSource || 'none'}</span>
                  <span className="text-muted-foreground">Resolved Job ID</span>
                  <span className="text-foreground break-all">{job.debug.resolvedJobId || job.jobId}</span>
                  <span className="text-muted-foreground">Matched Existing</span>
                  <span className="text-foreground">{String(!!job.debug.matchedExistingJob)}</span>
                  <span className="text-muted-foreground">Has JD Cache</span>
                  <span className="text-foreground">{String(!!job.debug.hasJdEmbeddingsCache)}</span>
                  <span className="text-muted-foreground">JD Embedding Computed</span>
                  <span className="text-foreground">{String(!!job.debug.jdEmbeddingComputed)}</span>
                  <span className="text-muted-foreground">Resume On-Demand</span>
                  <span className="text-foreground">{String(!!job.debug.resumeEmbeddingsComputedOnDemand)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: AI Recommendations ════ */}
        {activeTab === 'recs' && (
          <div className="space-y-3">
            {!job.recommendations?.length ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No recommendations available.
              </div>
            ) : (
              <>
              {job.resumeTitle === '__deleted__' && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-700 mb-3">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    The resume used for this analysis has been deleted.
                    Recommendations are shown for reference only — approve/dismiss is disabled.
                    Use <strong>Re-Analyze</strong> above with a new resume to apply changes.
                  </span>
                </div>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {job.recommendations.length} Recommendations
              </p>
                {job.recommendations.map((rec, idx) => (
                  <motion.div
                    key={rec.recommendationId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...gentleSpring, delay: idx * 0.05 }}
                  >
                    <RecommendationCard
                      rec={rec}
                      resumeDeleted={job.resumeTitle === '__deleted__'}
                      onAction={(action, text) => onRecommendation(rec.recommendationId, action, text)}
                    />
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ════ TAB: Interview Coach ════ */}
        {activeTab === 'interview' && (
          <InterviewPrepPanel job={job} onUpdate={onPrepUpdate} />
        )}

      </div>
    </div>
  )
}

function RecommendationCard({ rec, onAction, resumeDeleted = false }) {
  const isResolved = rec.status === 'approved' || rec.status === 'dismissed'

  const accentColor =
    rec.impact === 'high' ? 'bg-destructive' :
    rec.impact === 'medium' ? 'bg-orange-400' :
    'bg-muted-foreground/30'

  const impactBadgeClass =
    rec.impact === 'high' ? 'bg-destructive/10 text-destructive' :
    rec.impact === 'medium' ? 'bg-orange-500/10 text-orange-500' :
    'bg-secondary text-muted-foreground'

  return (
    <div className={`bg-card rounded-xl border border-border/60 overflow-hidden transition-all ${isResolved ? 'opacity-50' : ''}`}>
      {/* Coloured top accent line */}
      <div className={`h-0.5 w-full ${accentColor}`} />

      <div className="p-4">
        {/* Impact badge + type badge + resolved badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${impactBadgeClass}`}>
              {rec.impact?.toUpperCase()} IMPACT
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">
              {rec.type?.replace('_', ' ')}
            </span>
          </div>
          {rec.status !== 'pending' && (
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
              rec.status === 'approved'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-secondary text-muted-foreground border-border/40'
            }`}>
              {rec.status}
            </span>
          )}
        </div>

        {/* Current text block */}
        {rec.currentText && (
          <div className="mb-3">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              Current
            </p>
            <div className="bg-secondary/60 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground line-through leading-relaxed">
                {rec.currentText}
              </p>
            </div>
          </div>
        )}

        {/* Suggested text block */}
        <div className="mb-3">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
            Suggested
          </p>
          <div className="bg-card rounded-lg p-3 border border-border/40">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {rec.suggestedText}
            </p>
          </div>
        </div>

        {/* Reason */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4 italic">
          {rec.reason}
        </p>

        {/* Approve / Dismiss buttons */}
        {rec.status === 'pending' && !resumeDeleted && (
          <div className="flex items-center gap-3 pt-3 border-t border-border/30">
            <Button
              size="sm"
              onClick={() => onAction('approve')}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-5 text-xs"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction('dismiss')}
              className="rounded-full px-5 text-xs text-muted-foreground"
            >
              Dismiss
            </Button>
          </div>
        )}
        {rec.status === 'pending' && resumeDeleted && (
          <div className="pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground italic">
              Re-analyze with a new resume to apply these changes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ResumePickerReanalyze({ job, onReanalyze, isReanalyzing }) {
  const [resumes, setResumes] = useState([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [loadingResumes, setLoadingResumes] = useState(true)

  useEffect(() => {
    api.getResumes()
      .then(data => {
        setResumes(data)
        if (data.length > 0) setSelectedResumeId(data[0].resumeId)
      })
      .catch(() => {})
      .finally(() => setLoadingResumes(false))
  }, [])

  const handleClick = () => {
    if (!selectedResumeId) return
    onReanalyze({ ...job, resumeId: selectedResumeId })
  }

  if (loadingResumes) return <Spinner size="sm" />

  if (resumes.length === 0) {
    return <span className="text-xs text-muted-foreground italic">No resumes available</span>
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedResumeId}
        onChange={e => setSelectedResumeId(e.target.value)}
        className="px-2 py-1.5 text-xs bg-secondary border border-border/40 rounded-xl text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring max-w-[160px] truncate"
      >
        {resumes.map(r => (
          <option key={r.resumeId} value={r.resumeId}>
            {r.resumeTitle || 'Untitled Resume'}
          </option>
        ))}
      </select>
      <Button
        onClick={handleClick}
        disabled={isReanalyzing || !selectedResumeId}
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 rounded-full border-orange-300 text-orange-500 text-xs px-3 hover:bg-orange-50"
      >
        {isReanalyzing ? (
          <Spinner size="sm" />
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-Analyze
          </>
        )}
      </Button>
    </div>
  )
}

function ExtensionGuide({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Setup Extension" size="md">
      <div className="space-y-5 pb-4">
        <p className="text-sm text-slate-600">Load the extension to start scraping jobs from LinkedIn and generic job portals.</p>
        <div className="space-y-3">
          {[
            'Open chrome://extensions in your browser.',
            'Enable "Developer Mode" in the top right.',
            'Click "Load Unpacked" and select the /extension folder.',
            'Navigate to any job listing and click the IQ icon.'
          ].map((step, i) => (
            <div key={i} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{i+1}</span>
              <p className="text-sm font-medium text-slate-700">{step}</p>
            </div>
          ))}
        </div>
        <Button onClick={onClose} className="w-full mt-2">I have installed it</Button>
      </div>
    </Modal>
  )
}
