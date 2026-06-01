import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Loader2, ArrowLeft, Clock, Zap, Target, Play, Calendar, Activity, CheckCircle2, ChevronRight, BarChart3 } from 'lucide-react'
import { cn } from '../lib/utils'
import Modal from '../components/ui/Modal'
import '../study-center.css'

export default function JobSessionsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  
  const [sessions, setSessions] = useState([])
  const [jobMatch, setJobMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      api.listInterviewSessions(),
      jobId.startsWith('custom-') ? Promise.resolve(null) : api.getJob(jobId)
    ]).then(([sessionsData, jobData]) => {
      const allSessions = sessionsData || []
      
      const groupSessions = allSessions.filter(s => {
        const key = s.job_id || `custom-${s.id}`
        return key === jobId
      })
      
      setSessions(groupSessions)
      if (jobData) {
        setJobMatch(jobData)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [jobId])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex justify-center items-center bg-[#fcfcfd]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  const title = jobMatch ? jobMatch.jobTitle : 'Custom JD Prep'
  const company = jobMatch ? jobMatch.company : 'Custom Role'
  const totalSessions = sessions.length
  const totalRounds = sessions.reduce((acc, s) => acc + (s.selected_rounds?.length || 0), 0)

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#fcfcfd] premium-bg flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto p-6 md:p-8 flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Navigation & Header - Anchored at top */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/study-prep-center/interviews')}
            className="mb-6 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Interviews
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-white shadow-lg">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-[#0f0f14] tracking-tight">{title}</h1>
                  <p className="text-slate-500 font-medium">{company}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/study-prep-center/interview-prep')}
              className="px-6 py-3 bg-[#0f0f14] hover:bg-indigo-900 text-white rounded-xl font-bold shadow-lg shadow-gray-900/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Generate New Session
            </button>
          </div>
        </div>

        {/* Dashboard Layout: Fills the screen */}
        <div className="flex flex-col lg:flex-row gap-8 flex-1">
          
          {/* Main Content Area (Sessions) */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Active Training Sessions</h2>
              <span className="text-sm font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                {totalSessions} Total
              </span>
            </div>

            {sessions.length === 0 ? (
              <div className="flex-1 bg-white/50 backdrop-blur-sm border border-slate-200/60 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
                  <Play className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No active sessions</h3>
                <p className="text-slate-500 max-w-sm mb-6">Generate your first mock interview session targeted to this role to begin training.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 content-start">
                {sessions.map((s, idx) => {
                  const isFaang = s.difficulty === 'faang'
                  const accentColor = isFaang ? '#f43f5e' : s.difficulty === 'hard' ? '#f59e0b' : '#3b82f6'
                  
                  return (
                    <div
                      key={s.id}
                      className="glass-card rounded-2xl border border-slate-200/60 p-6 flex flex-col group relative hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
                      
                      <div className="flex items-start justify-between mb-5 relative z-10">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: accentColor + '15', color: accentColor }}
                          >
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">Session #{idx + 1}</h3>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-1 inline-block",
                              isFaang ? "bg-rose-100 text-rose-700" :
                              s.difficulty === 'hard' ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {s.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mb-8 relative z-10">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                            <Activity className="w-4 h-4 text-indigo-500" />
                            {s.selected_rounds ? s.selected_rounds.length : 0} Rounds
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.default_mode} mode</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs px-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Generated {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/study-prep-center/interview-prep/${s.id}`)}
                        className="mt-auto w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 text-white shadow-md hover:shadow-lg active:scale-[0.98] relative z-10 overflow-hidden"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Play className="w-4 h-4 fill-white" /> Enter Session
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar: Analytics & Details */}
          <div className="w-full lg:w-[400px] flex flex-col gap-6">
            
            {/* ATS Match Card */}
            <div className="glass-card rounded-3xl p-8 border border-slate-200/60 shadow-sm relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                <BarChart3 className="w-5 h-5 text-emerald-500" /> Job Alignment
              </h3>
              
              <div className="flex items-end gap-4 mb-6 relative z-10">
                <div className="text-6xl font-black tracking-tighter text-emerald-600">
                  {jobMatch ? jobMatch.atsScore : '--'}
                </div>
                <div className="text-emerald-700 font-bold text-xl mb-1.5">%</div>
              </div>
              
              <p className="text-sm text-slate-500 leading-relaxed relative z-10 mb-6">
                Your resume currently matches the core requirements for this specific role. Training sessions will focus on addressing any identified skill gaps.
              </p>
              
              {jobMatch && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm transition-colors flex items-center justify-between px-4 cursor-pointer"
                >
                  View Full Breakdown
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Training Stats Card */}
            <div className="glass-card rounded-3xl p-8 border border-slate-200/60 shadow-sm flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" /> Training Volume
              </h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-slate-600">Total Rounds</span>
                    <span className="font-bold text-indigo-700">{totalRounds}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full w-[60%]"></div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Focus Areas</h4>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Behavioral & Cultural
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> System Design
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Core Algorithms
                    </li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {jobMatch && (
        <JobAnalysisModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          job={jobMatch} 
        />
      )}
    </div>
  )
}

function JobAnalysisModal({ isOpen, onClose, job }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Job Analysis Breakdown" size="md">
      <div className="space-y-6">
        {job.breakdown && (
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
              Score Breakdown
            </p>
            <div className="space-y-4">
              {Object.entries(job.breakdown).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-700 capitalize font-medium flex-shrink-0">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="w-full max-w-[150px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold w-9 text-right text-slate-700">
                      {val}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(job.strongMatches?.length > 0 || job.missingKeywords?.length > 0) && (
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Keyword Analysis (ATS)
              </p>
              <div className="flex gap-3 text-[10px] font-medium">
                <span className="text-emerald-600 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Matched
                </span>
                <span className="text-rose-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Missing
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {job.strongMatches?.map((kw, i) => (
                <span
                  key={`strong-${i}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100/50 text-emerald-700 border border-emerald-200 rounded-lg"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {kw}
                </span>
              ))}
              {job.missingKeywords?.map((kw, i) => (
                <span
                  key={`missing-${i}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-100/50 text-rose-700 border border-rose-200 rounded-lg"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
