import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import ModelSelector from '../components/study_center/ModelSelector'
import ConfirmGenerationModal from '../components/study_center/ConfirmGenerationModal'
import { Briefcase, Activity, Zap, Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'

export default function SkillGapPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  
  const [modelsDict, setModelsDict] = useState({})
  const [model, setModel] = useState('')
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState('')
  const [visibleJobsCount, setVisibleJobsCount] = useState(5)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    api.getJobs()
      .then(data => setJobs(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleKeywordClick = (keyword) => {
    if (!model) {
      alert("Please select an AI Engine first.")
      return
    }
    setSelectedSkill(keyword)
    setIsConfirmOpen(true)
  }

  const handleGenerateRoadmap = async () => {
    if (!selectedJob || !model || !selectedSkill) return
    setAnalyzing(true)

    try {
      const payload = {
        skill_name: selectedSkill,
        model_key: model,
        roadmap_type: 'skill_gap',
        experience_level: 'intermediate',
        source_job_id: selectedJob.jobId,
        role_context: `${selectedJob.jobTitle} at ${selectedJob.company}`,
        gap_status: 'identified_from_ats'
      }
      const res = await api.generateRoadmap(payload)
      setIsConfirmOpen(false)
      navigate(`/study-prep-center/roadmaps/${res.id}`)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to generate roadmap')
      setAnalyzing(false)
    }
  }

  const handleLoadMore = () => {
    setVisibleJobsCount(prev => prev + 5)
  }

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="mb-6">
        <button onClick={() => navigate('/study-prep-center')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Study Center
        </button>
      </div>
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-inner">
          <Zap className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Identify Skill Gaps</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Select a job you've analyzed to view extracted skills. Select an AI engine, then click any skill to instantly generate a tailored learning roadmap.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Job Selection */}
        <div className="lg:col-span-5 space-y-5">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            1. Select Job Context
          </h2>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 pb-4">
            {jobs.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center shadow-sm">
                <p className="text-slate-500 mb-4 font-medium">No jobs analyzed yet.</p>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors"
                >
                  Go to Dashboard to add one
                </button>
              </div>
            ) : (
              <>
                {jobs.slice(0, visibleJobsCount).map(job => {
                  const isSelected = selectedJob?.jobId === job.jobId
                  return (
                    <button
                      key={job.jobId}
                      onClick={() => setSelectedJob(job)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/30 shadow-[0_8px_30px_rgb(55,48,163,0.12)] transform -translate-y-1' 
                          : 'border-slate-200 hover:border-indigo-300 bg-white hover:shadow-lg hover:-translate-y-1'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                            {job.jobTitle || 'Untitled Role'}
                          </h3>
                          <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            {job.company}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                        }`}>
                          <Activity className="w-3.5 h-3.5" />
                          {job.atsScore}% Match
                        </div>
                      </div>
                    </button>
                  )
                })}
                
                {visibleJobsCount < jobs.length && (
                  <button
                    onClick={handleLoadMore}
                    className="w-full mt-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 font-semibold rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    Load More Jobs
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Model Selection & Skills */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`transition-all duration-500 ${selectedJob ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-4'}`}>
            <h2 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wide">
              2. Generate Roadmap
            </h2>
            
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-8">
              <ModelSelector 
                selectedModel={model} 
                onModelChange={setModel}
                onModelsLoaded={setModelsDict}
                disabled={analyzing || !selectedJob}
              />

              {selectedJob && (
                <div className="space-y-8 pt-6 border-t border-slate-100">
                  {/* Missing Skills */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-500" />
                      Missing Skills from Resume
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.missingKeywords?.length > 0 ? (
                        selectedJob.missingKeywords.map((kw, i) => (
                          <button
                            key={i}
                            onClick={() => handleKeywordClick(kw)}
                            disabled={analyzing}
                            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                          >
                            {kw}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 italic">No missing skills detected.</p>
                      )}
                    </div>
                  </div>

                  {/* Matched Skills */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Matched Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.strongMatches?.length > 0 ? (
                        selectedJob.strongMatches.map((kw, i) => (
                          <button
                            key={i}
                            onClick={() => handleKeywordClick(kw)}
                            disabled={analyzing}
                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                          >
                            {kw}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 italic">No matched skills detected.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmGenerationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleGenerateRoadmap}
        model={modelsDict[model]}
        title={`Generate Roadmap: ${selectedSkill}`}
        actionText="Generate Roadmap"
        generating={analyzing}
      />
    </div>
  )
}
