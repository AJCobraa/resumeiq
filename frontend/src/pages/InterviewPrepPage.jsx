import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import ModelSelector from '../components/study_center/ModelSelector'
import {
  Briefcase, Activity, Zap, Loader2, ArrowLeft, ChevronRight, FileText,
  CheckCircle2, Circle, Users, Code, GitBranch, LayoutGrid, Brain, BookOpen,
  AlertCircle, Info, Clock, Check, Rocket
} from 'lucide-react'
import '../study-center.css'

const ROUND_DEFS = [
  {
    id: 'technical',
    label: 'Technical Questions',
    icon: Code,
    color: '#3b82f6', // blue
    bg: 'bg-blue-50 border-blue-200 text-blue-700',
    description: 'Probes JD keywords and missing skills with company-specific depth',
    alwaysDefault: true,
  },
  {
    id: 'system_design',
    label: 'System Design',
    icon: GitBranch,
    color: '#10b981', // emerald
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    description: 'Architecture and scale challenges calibrated to company tier',
    seniorDefault: true,
  },
  {
    id: 'dsa',
    label: 'DSA Patterns',
    icon: Brain,
    color: '#8b5cf6', // violet
    bg: 'bg-violet-50 border-violet-200 text-violet-700',
    description: 'Algorithm questions weighted to this company\'s interview style, with LeetCode links',
  },
  {
    id: 'behavioral',
    label: 'Behavioral',
    icon: Users,
    color: '#f59e0b', // amber
    bg: 'bg-amber-50 border-amber-200 text-amber-700',
    description: 'Culture fit, leadership stories calibrated to this specific company\'s values',
    alwaysDefault: true,
  },
  {
    id: 'lld',
    label: 'Low-Level Design',
    icon: LayoutGrid,
    color: '#ec4899', // pink
    bg: 'bg-pink-50 border-pink-200 text-pink-700',
    description: 'Class design, OOP patterns and SOLID principles',
    seniorDefault: true,
  },
  {
    id: 'resume_deep_dive',
    label: 'Resume Deep Dive',
    icon: BookOpen,
    color: '#f43f5e', // rose
    bg: 'bg-rose-50 border-rose-200 text-rose-700',
    description: 'Questions derived directly from your actual projects and experience bullets',
    alwaysDefault: true,
  },
]

function detectSeniorRole(jobTitle = '') {
  const title = jobTitle.toLowerCase()
  return ['senior', 'staff', 'principal', 'architect', 'lead', 'manager'].some(k => title.includes(k))
}

function getDefaultRounds(jobTitle = '') {
  const isSenior = detectSeniorRole(jobTitle)
  return ROUND_DEFS
    .filter(r => r.alwaysDefault || (isSenior && r.seniorDefault))
    .map(r => r.id)
}

export default function InterviewPrepPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedJobId = searchParams.get('jobId')

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleJobsCount, setVisibleJobsCount] = useState(5)

  // Source selection
  const [sourceTab, setSourceTab] = useState('job') // 'job' | 'jd'
  const [selectedJob, setSelectedJob] = useState(null)
  const [jdText, setJdText] = useState('')
  const [jdTitle, setJdTitle] = useState('')
  const [jdCompany, setJdCompany] = useState('')

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1) // 1-4
  const [selectedRounds, setSelectedRounds] = useState(['technical', 'behavioral', 'resume_deep_dive'])
  const [difficulty, setDifficulty] = useState('hard')
  const [questionsPerRound, setQuestionsPerRound] = useState(10)
  const [defaultMode, setDefaultMode] = useState('study')

  // Model
  const [model, setModel] = useState('')
  const [modelsDict, setModelsDict] = useState({})

  // Generation
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Resume list
  const [resumes, setResumes] = useState([])
  const [selectedResume, setSelectedResume] = useState('')

  useEffect(() => {
    Promise.all([
      api.getJobs().then(data => {
        setJobs(data || [])
        if (preselectedJobId) {
          const found = (data || []).find(j => j.jobId === preselectedJobId)
          if (found) {
            setSelectedJob(found)
            setSelectedRounds(getDefaultRounds(found.jobTitle))
            if (found.resumeId) setSelectedResume(found.resumeId)
          }
        }
      }),
      api.getResumes().then(data => {
        setResumes(data || [])
        if (data?.length > 0) setSelectedResume(data[0].resumeId)
      }),
    ]).catch(console.error).finally(() => setLoading(false))
  }, [preselectedJobId])

  const jdCharCount = jdText.trim().length
  const jdOverLimit = jdCharCount > 3000
  const jdNearLimit = jdCharCount > 2500

  // For Job mode, just having a selectedJob is enough (resume is tied to job analysis)
  // For JD mode, need text, title, company, and a selected resume
  const canProceedStep1 = sourceTab === 'job' 
    ? !!selectedJob 
    : (jdText.trim().length >= 20 && !jdOverLimit && !!selectedResume && !!jdTitle.trim() && !!jdCompany.trim())
  const canProceedStep2 = selectedRounds.length > 0
  const canGenerate = model && !generating && !jdOverLimit

  const toggleRound = (id) => {
    setSelectedRounds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const handleJobSelect = (job) => {
    setSelectedJob(job)
    setSelectedRounds(getDefaultRounds(job.jobTitle))
    if (job.resumeId) setSelectedResume(job.resumeId)
    setWizardStep(1)
    setError('')
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setError('')
    try {
      const payload = {
        model_key: model,
        selected_rounds: selectedRounds,
        questions_per_round: questionsPerRound,
        difficulty,
        default_mode: defaultMode,
      }
      
      // Send resume_id if provided (for JD mode, or if backend needs it fallback)
      if (selectedResume) {
        payload.resume_id = selectedResume
      }

      if (sourceTab === 'job' && selectedJob) {
        payload.job_id = selectedJob.jobId
      } else {
        payload.jd_text = jdText.trim()
        payload.jd_title = jdTitle.trim()
        payload.jd_company = jdCompany.trim()
      }
      
      const session = await api.generateInterviewSession(payload)
      navigate(`/study-prep-center/interview-prep/${session.id}`)
    } catch (err) {
      setError(err.message || 'Failed to generate interview prep')
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex justify-center items-center bg-[#fcfcfd]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#fcfcfd] premium-bg flex flex-col py-10">
      <div className="max-w-[1300px] w-full mx-auto px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Back */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/study-prep-center/interviews')}
            className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Training Sessions
          </button>
        </div>

        {/* Header */}
        <div className="mb-12 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-white shadow-xl shadow-indigo-900/20 shrink-0">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f0f14] tracking-tight mb-2">Configure Simulation</h1>
            <p className="text-sm md:text-base text-slate-500 max-w-2xl">
              Dynamically generate a company-specific, multi-round interview. Our AI will probe your exact skill gaps and experience.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* ── Left: Job/JD Selection ── */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">1</div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Select Context</h2>
            </div>

            {/* Source toggle */}
            <div className="bg-slate-200/50 p-1.5 rounded-2xl flex gap-1.5 shadow-inner">
              <button
                onClick={() => setSourceTab('job')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                  sourceTab === 'job' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                From Analyzed Job
              </button>
              <button
                onClick={() => setSourceTab('jd')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                  sourceTab === 'jd' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Paste New JD
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-50"></div>
              
              <div className="relative z-10 flex-1">
                {sourceTab === 'job' ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {jobs.length === 0 ? (
                      <div className="border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                        <p className="text-slate-500 mb-4 font-medium">No jobs analyzed yet.</p>
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="px-5 py-2.5 bg-[#0f0f14] hover:bg-indigo-900 text-white rounded-xl font-bold text-sm transition-colors"
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    ) : (
                      <>
                        {jobs.slice(0, visibleJobsCount).map(job => {
                          const isSelected = selectedJob?.jobId === job.jobId
                          const usedResume = resumes.find(r => r.resumeId === job.resumeId)
                          
                          return (
                            <button
                              key={job.jobId}
                              onClick={() => handleJobSelect(job)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50/30 shadow-md transform -translate-y-1'
                                  : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm hover:-translate-y-0.5'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <p className={`font-extrabold text-base mb-1 ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                                    {job.jobTitle || 'Untitled Role'}
                                  </p>
                                  <p className="text-sm text-slate-500 font-medium">{job.company}</p>
                                  {usedResume && (
                                    <p className="text-xs text-indigo-600 font-bold mt-1.5 flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5" /> Resume: {usedResume.resumeTitle || 'Untitled Resume'}
                                    </p>
                                  )}
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  <Activity className="w-3.5 h-3.5" />
                                  {job.atsScore}%
                                </div>
                              </div>
                            </button>
                          )
                        })}
                        {visibleJobsCount < jobs.length && (
                          <button
                            onClick={() => setVisibleJobsCount(p => p + 5)}
                            className="w-full mt-2 py-3 text-sm font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 rounded-xl transition-all"
                          >
                            Load More Jobs
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col h-full gap-4 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Target Position *
                        </label>
                        <input
                          type="text"
                          value={jdTitle}
                          onChange={(e) => setJdTitle(e.target.value)}
                          placeholder="e.g. Senior Frontend Engineer"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={jdCompany}
                          onChange={(e) => setJdCompany(e.target.value)}
                          placeholder="e.g. Google"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="flex-1 relative flex flex-col">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Job Description *
                      </label>
                      <textarea
                        value={jdText}
                        onChange={e => setJdText(e.target.value)}
                        placeholder="Paste the Job Description here... We'll analyze the exact requirements to build the mock rounds."
                        className={`w-full min-h-[250px] flex-1 px-5 py-4 rounded-2xl border-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none outline-none transition-all ${
                          jdOverLimit
                            ? 'border-red-300 bg-red-50 focus:border-red-400'
                            : jdNearLimit
                            ? 'border-amber-300 bg-amber-50 focus:border-amber-400'
                            : 'border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white'
                        }`}
                      />
                      <div className={`absolute bottom-3 right-4 text-xs font-bold ${
                        jdOverLimit ? 'text-red-600' : jdNearLimit ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {jdCharCount.toLocaleString()} / 3,000
                      </div>
                    </div>
                    {jdOverLimit && (
                      <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-100">
                        <AlertCircle className="w-4 h-4" /> JD too long. Please trim.
                      </p>
                    )}

                    {/* ONLY SHOW RESUME SELECTOR IF PASTE JD MODE */}
                    {resumes.length > 0 && (
                      <div className="mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Select Baseline Resume
                        </label>
                        <select
                          value={selectedResume}
                          onChange={e => setSelectedResume(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors cursor-pointer shadow-sm"
                        >
                          {resumes.map(r => (
                            <option key={r.resumeId} value={r.resumeId}>{r.resumeTitle || 'Untitled Resume'}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Setup Wizard ── */}
          <div className={`lg:col-span-7 flex flex-col gap-5 transition-all duration-700 ${canProceedStep1 ? 'opacity-100 translate-x-0' : 'opacity-30 pointer-events-none translate-x-4'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">2</div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Configure Simulation</h2>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-2xl shadow-indigo-900/5 flex flex-col relative overflow-hidden">
              
              {/* Sleek Steps Indicator */}
              <div className="flex px-6 pt-6 pb-4 bg-slate-50/50 border-b border-slate-100">
                {[
                  { n: 1, label: 'Rounds' },
                  { n: 2, label: 'Depth' },
                  { n: 3, label: 'Mode' },
                  { n: 4, label: 'Deploy' },
                ].map((s, idx) => {
                  const isActive = wizardStep === s.n
                  const isCompleted = wizardStep > s.n
                  return (
                    <div key={s.n} className="flex-1 flex flex-col items-center relative">
                      {idx !== 3 && (
                        <div className={`absolute top-4 left-[60%] right-[-40%] h-0.5 rounded-full ${isCompleted ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                      )}
                      <button
                        onClick={() => setWizardStep(s.n)}
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                          isActive
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-110'
                            : isCompleted
                            ? 'border-indigo-600 bg-white text-indigo-600'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : s.n}
                      </button>
                      <span className={`mt-2 text-xs font-bold tracking-wide transition-colors ${isActive ? 'text-indigo-900' : isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="p-8 flex-1">
                
                {/* Step 1 — Rounds */}
                <div className={`transition-all duration-500 ${wizardStep === 1 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">Select Interview Modules</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8">Modules are pre-selected based on the seniority and domain of your target role. Adjust as needed.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ROUND_DEFS.map(r => {
                      const Icon = r.icon
                      const checked = selectedRounds.includes(r.id)
                      return (
                        <button
                          key={r.id}
                          onClick={() => toggleRound(r.id)}
                          className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-200 text-left relative overflow-hidden group ${
                            checked
                              ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                              : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white'
                          }`}
                        >
                          {checked && <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full pointer-events-none"></div>}
                          
                          <div className="flex justify-between w-full mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${checked ? r.bg : 'bg-white border-slate-200 text-slate-400'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            {checked ? <CheckCircle2 className="w-6 h-6 text-indigo-600" /> : <Circle className="w-6 h-6 text-slate-300 group-hover:text-slate-400" />}
                          </div>
                          <h4 className={`font-bold text-sm mb-1.5 ${checked ? 'text-slate-900' : 'text-slate-700'}`}>{r.label}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{r.description}</p>
                        </button>
                      )
                    })}
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => setWizardStep(2)}
                      disabled={!canProceedStep2}
                      className="px-8 py-3.5 bg-[#0f0f14] hover:bg-indigo-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-40 transition-all shadow-lg active:scale-95"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Step 2 — Depth */}
                <div className={`transition-all duration-500 ${wizardStep === 2 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">Simulation Difficulty & Depth</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8">Calibrate the AI interviewer's aggressiveness and technical expectations.</p>

                  <div className="space-y-8">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
                        <Activity className="w-4 h-4 text-indigo-600" /> Aggressiveness Level
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { val: 'standard', label: 'Standard', desc: 'Mid-level, practical questions', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                          { val: 'hard', label: 'Hard', desc: 'Senior depth, rigorous follow-ups', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                          { val: 'faang', label: 'FAANG Level', desc: 'Extreme depth, scale & complexity constraints', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                        ].map(d => {
                          const isActive = difficulty === d.val
                          return (
                            <button
                              key={d.val}
                              onClick={() => setDifficulty(d.val)}
                              className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                                isActive ? d.bg + ' shadow-md transform -translate-y-1' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300'
                              }`}
                            >
                              <p className={`font-extrabold text-base mb-1 ${isActive ? d.color : 'text-slate-700'}`}>{d.label}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{d.desc}</p>
                              {isActive && <CheckCircle2 className={`absolute top-4 right-4 w-5 h-5 ${d.color}`} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
                        <FileText className="w-4 h-4 text-indigo-600" /> Volume per Round
                      </label>
                      <div className="flex gap-4">
                        {[5, 10, 15].map(n => (
                          <button
                            key={n}
                            onClick={() => setQuestionsPerRound(n)}
                            className={`flex-1 py-4 rounded-2xl border-2 text-base font-black transition-all ${
                              questionsPerRound === n
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg'
                                : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            {n} Qs
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                        <Info className="w-4 h-4" />
                        Total simulation size: ~{selectedRounds.length * questionsPerRound} questions
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => setWizardStep(1)} className="px-5 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">← Back</button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className="px-8 py-3.5 bg-[#0f0f14] hover:bg-indigo-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Step 3 — Mode Preference */}
                <div className={`transition-all duration-500 ${wizardStep === 3 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">Execution Mode</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8">Choose how you want to interact with the generated simulation.</p>

                  <div className="space-y-4">
                    <button
                      onClick={() => setDefaultMode('study')}
                      className={`w-full p-6 rounded-3xl border-2 text-left transition-all flex items-start gap-5 ${
                        defaultMode === 'study' ? 'border-indigo-500 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-indigo-200'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${defaultMode === 'study' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-100 text-slate-400'}`}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className={`text-lg font-extrabold mb-1 ${defaultMode === 'study' ? 'text-indigo-950' : 'text-slate-900'}`}>Study First (Untimed)</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">Review the complete list of generated questions upfront. The AI provides detailed study guides, hints, and core concepts for each question before you attempt answering. Best for learning.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setDefaultMode('mock')}
                      className={`w-full p-6 rounded-3xl border-2 text-left transition-all flex items-start gap-5 ${
                        defaultMode === 'mock' ? 'border-rose-500 bg-rose-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-rose-200'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${defaultMode === 'mock' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-100 text-slate-400'}`}>
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className={`text-lg font-extrabold mb-1 ${defaultMode === 'mock' ? 'text-rose-950' : 'text-slate-900'}`}>Blind Mock (Timed)</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">Launch directly into a high-pressure, timed environment. Questions are revealed one by one. The AI critically scores your responses against rubrics in real-time. Best for final prep.</p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => setWizardStep(2)} className="px-5 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">← Back</button>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="px-8 py-3.5 bg-[#0f0f14] hover:bg-indigo-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Step 4 — Model + Generate */}
                <div className={`transition-all duration-500 ${wizardStep === 4 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-2">Deploy Simulation</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8">Select the underlying AI engine to generate your tailored interview content.</p>

                  <ModelSelector
                    selectedModel={model}
                    onModelChange={setModel}
                    onModelsLoaded={setModelsDict}
                    baseOperation="generate_interview_prep_v2"
                    disabled={generating}
                  />

                  {/* Config summary */}
                  <div className="mt-8 p-6 bg-[#0f0f14] rounded-2xl relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Mission Profile</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="block text-xs font-semibold text-white/50 mb-1">Rounds</span>
                        <span className="text-base font-black text-white">{selectedRounds.length}</span>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="block text-xs font-semibold text-white/50 mb-1">Questions</span>
                        <span className="text-base font-black text-white">~{selectedRounds.length * questionsPerRound}</span>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="block text-xs font-semibold text-white/50 mb-1">Difficulty</span>
                        <span className="text-base font-black text-white capitalize flex items-center gap-1">
                          {difficulty === 'faang' ? <Zap className="w-3.5 h-3.5 text-rose-400" /> : null}
                          {difficulty}
                        </span>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <span className="block text-xs font-semibold text-white/50 mb-1">Mode</span>
                        <span className="text-base font-black text-white capitalize">{defaultMode}</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="mt-8 flex justify-between items-center">
                    <button onClick={() => setWizardStep(3)} className="px-5 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">← Back</button>
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate || !model}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-base shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                      {generating ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Generating Engine...</>
                      ) : (
                        <><Rocket className="w-5 h-5" /> Deploy Simulation</>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
