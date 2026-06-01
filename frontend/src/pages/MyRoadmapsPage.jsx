import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Map, Loader2, Trash2, ArrowRight, BookOpen, ArrowLeft } from 'lucide-react'

export default function MyRoadmapsPage() {
  const navigate = useNavigate()
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    api.listRoadmaps()
      .then(res => setRoadmaps(res || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this roadmap? This action cannot be undone.')) return
    
    try {
      await api.deleteRoadmap(id)
      setRoadmaps(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete roadmap')
    }
  }

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="mb-6">
        <button onClick={() => navigate('/study-prep-center')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Study Center
        </button>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3 flex items-center gap-4 tracking-tight">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            My Learning Roadmaps
          </h1>
          <p className="text-lg text-slate-500 font-medium ml-[4.25rem]">Access and track your active learning paths.</p>
        </div>
        <button
          onClick={() => navigate('/study-prep-center/learn-skill')}
          className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-6 rounded-2xl transition-colors border border-indigo-200/50 shadow-sm"
        >
          <Map className="w-5 h-5" /> New Roadmap
        </button>
      </div>

      {roadmaps.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-dashed border-slate-300 p-16 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-slate-50 text-slate-400 mb-6 shadow-inner border border-slate-100">
            <Map className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Roadmaps Yet</h3>
          <p className="text-lg text-slate-500 mb-8 max-w-lg mx-auto font-medium">
            You haven't generated any learning roadmaps yet. Start by identifying skill gaps from your job analysis or generate a custom one.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/study-prep-center/skill-gap')}
              className="px-8 py-3.5 bg-white border-2 border-slate-200 hover:border-indigo-300 rounded-2xl font-bold text-slate-700 hover:text-indigo-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Analyze Skill Gaps
            </button>
            <button
              onClick={() => navigate('/study-prep-center/learn-skill')}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-white shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgb(79,70,229,0.23)] hover:-translate-y-0.5 transition-all"
            >
              Learn Custom Skill
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roadmaps.map(roadmap => (
            <div 
              key={roadmap.id}
              onClick={() => navigate(`/study-prep-center/roadmaps/${roadmap.id}`)}
              className="bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 hover:border-indigo-300 transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden"
            >
              {/* Type Badge */}
              <div className="absolute top-0 right-0 bg-slate-50 px-4 py-2 rounded-bl-2xl border-b border-l border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest z-10">
                {roadmap.roadmap_type === 'SKILL_GAP' ? 'From Gap Analysis' : 'Custom'}
              </div>
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

              <div className="flex-1 mt-4 relative z-10">
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors line-clamp-2 pr-4 tracking-tight leading-tight">
                  {roadmap.skill_name}
                </h3>
                <p className="text-sm font-bold text-slate-500 capitalize">{roadmap.experience_level} Level</p>
                <div className="text-xs font-semibold text-slate-400 mt-6 flex items-center gap-2 bg-slate-50 w-fit px-3 py-1.5 rounded-lg border border-slate-100">
                  <span>Last accessed: {new Date(roadmap.last_accessed_at || roadmap.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                <div className="flex items-center text-sm font-extrabold text-indigo-600 group-hover:text-indigo-700 tracking-wide">
                  Continue <ArrowRight className="w-5 h-5 ml-1.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
                <button
                  onClick={(e) => handleDelete(e, roadmap.id)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
