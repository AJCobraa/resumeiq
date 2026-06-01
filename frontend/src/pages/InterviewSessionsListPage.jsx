import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Loader2, ArrowLeft, Plus, Briefcase, ChevronRight, Activity, Zap, TrendingUp, BookOpen, Clock } from 'lucide-react'
import '../study-center.css'

export default function InterviewSessionsListPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getJobs().then(data => setJobs(data || [])),
      api.listInterviewSessions().then(data => setSessions(data || []))
    ]).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex justify-center items-center bg-[#fcfcfd]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  const groupedSessions = Object.values(
    sessions.reduce((acc, s) => {
      const key = s.job_id || `custom-${s.id}`
      if (!acc[key]) {
        acc[key] = {
          job_id: key,
          sessions: []
        }
      }
      acc[key].sessions.push(s)
      return acc
    }, {})
  )

  const totalSessionsGenerated = sessions.length;
  const uniqueRolesTargeted = groupedSessions.length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#fcfcfd] premium-bg flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto p-6 md:p-8 flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Navigation & Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/study-prep-center')}
            className="mb-6 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Study Center
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-[#0f0f14] tracking-tight mb-2">Interview Targets</h1>
              <p className="text-slate-500 font-medium text-lg">
                Manage your targeted role simulations and track your readiness across companies.
              </p>
            </div>
            <button
              onClick={() => navigate('/study-prep-center/interview-prep')}
              className="px-6 py-3 bg-[#0f0f14] hover:bg-indigo-900 text-white rounded-xl font-bold shadow-lg shadow-gray-900/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> New Simulation
            </button>
          </div>
        </div>

        {/* Dashboard Layout: Fills vertical space */}
        <div className="flex flex-col lg:flex-row gap-8 flex-1">
          
          {/* Main Grid Area */}
          <div className="flex-1 flex flex-col">
            {sessions.length === 0 ? (
              <div className="flex-1 glass-card border border-slate-200/60 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Zap className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">No targets acquired yet</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
                  Set up your first company-specific interview simulation to begin advanced training.
                </p>
                <button
                  onClick={() => navigate('/study-prep-center/interview-prep')}
                  className="px-8 py-4 bg-[#0f0f14] hover:bg-indigo-900 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                >
                  Configure Target Role
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
                {groupedSessions.map(group => {
                  const originalJobId = group.job_id.startsWith('custom-') ? null : group.job_id;
                  const jobMatch = originalJobId ? jobs.find(j => j.jobId === originalJobId) : null;
                  const title = jobMatch ? jobMatch.jobTitle : 'Custom JD Prep';
                  const company = jobMatch ? jobMatch.company : 'Custom Role';
                  const scoreColor = jobMatch && jobMatch.atsScore > 75 ? 'text-emerald-600' : 'text-amber-600';
                  
                  return (
                    <div
                      key={group.job_id}
                      onClick={() => navigate(`/study-prep-center/interviews/${group.job_id}`)}
                      className="glass-card rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group"
                    >
                      <div className="p-6 flex-1 flex flex-col relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-white border border-slate-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Briefcase className="w-6 h-6" />
                          </div>
                          {jobMatch && (
                            <div className={`px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 flex items-center gap-1.5 ${scoreColor}`}>
                              <Activity className="w-3.5 h-3.5" />
                              ATS {jobMatch.atsScore}%
                            </div>
                          )}
                        </div>
                        
                        <h3 className="font-extrabold text-lg text-slate-900 mb-1 line-clamp-2">{title}</h3>
                        <p className="text-sm font-medium text-slate-500 mb-6">{company}</p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100/50 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold bg-slate-50 px-3 py-1.5 rounded-lg">
                            <Zap className="w-4 h-4 text-indigo-500" />
                            {group.sessions.length} Session{group.sessions.length !== 1 ? 's' : ''}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar: Global Platform Stats (Fills vertical space) */}
          <div className="w-full lg:w-[350px] flex flex-col gap-6">
            
            <div className="glass-card rounded-3xl p-8 border border-slate-200/60 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" /> Readiness Overview
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Roles</p>
                  <p className="text-3xl font-black text-slate-900">{uniqueRolesTargeted}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Simulations</p>
                  <p className="text-3xl font-black text-indigo-600">{totalSessionsGenerated}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-8 border border-slate-200/60 shadow-sm flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" /> Recent Activity
              </h3>
              
              <div className="flex flex-col gap-5 relative">
                {/* Vertical line connecting timeline */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white text-blue-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Platform Accessed</p>
                    <p className="text-xs text-slate-500">Today</p>
                  </div>
                </div>
                
                {sessions.length > 0 && (
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white text-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Simulation Generated</p>
                      <p className="text-xs text-slate-500">Recently</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
