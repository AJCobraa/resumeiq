import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Rocket, Map, BookOpen, Sparkles, Target, Zap, Play, Layers, Code, GitBranch, Brain, Users, LayoutGrid, FileText } from 'lucide-react'
import Modal from '../components/ui/Modal'
import '../study-center.css'

export default function StudyCenter() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [isTypesModalOpen, setIsTypesModalOpen] = useState(false)

  const ROUND_TYPES = [
    { id: 'tech', label: 'Technical Questions', icon: <Code className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100', desc: 'Probes JD keywords and missing skills with company-specific depth' },
    { id: 'system', label: 'System Design', icon: <GitBranch className="w-5 h-5" />, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100', desc: 'Architecture and scale challenges calibrated to company tier' },
    { id: 'dsa', label: 'DSA Patterns', icon: <Brain className="w-5 h-5" />, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100', desc: "Algorithm questions weighted to this company's interview style, with LeetCode links" },
    { id: 'behavioral', label: 'Behavioral', icon: <Users className="w-5 h-5" />, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', desc: "Culture fit, leadership stories calibrated to this specific company's values" },
    { id: 'lld', label: 'Low-Level Design', icon: <LayoutGrid className="w-5 h-5" />, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-100', desc: 'Class design, OOP patterns and SOLID principles' },
    { id: 'resume', label: 'Resume Deep Dive', icon: <FileText className="w-5 h-5" />, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100', desc: 'Questions derived directly from your actual projects and experience bullets' }
  ]

  return (
    <div className="min-h-[calc(100vh-64px)] text-[#1a1c1d] bg-[#fcfcfd] font-sans premium-bg flex flex-col justify-center py-10">
      <main className="relative z-10 px-6 max-w-[1200px] w-full mx-auto">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-8 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>

        {/* Sleek Header Section */}
        <section className="mb-12 text-center animate-spring-up flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0f0f14] tracking-tight mb-3">
            Training & Command Center
          </h1>
          <p className="text-base md:text-lg text-[#464553] max-w-2xl mx-auto">
            Your strategic hub for career acceleration. Run highly realistic mock interviews, analyze skill gaps, and execute personalized roadmaps.
          </p>
        </section>

        <div className="flex flex-col gap-6">
          
          {/* Featured Top Product: Interview Simulator */}
          <div className="relative group/hero cursor-pointer animate-spring-up" style={{ animationDelay: '100ms' }}>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-[2.2rem] opacity-30 blur-lg group-hover/hero:opacity-100 group-hover/hero:blur-xl transition-all duration-700 bg-[length:200%_auto] animate-[pulse_3s_ease-in-out_infinite]"></div>
            
            <div className="relative bg-[#0f0f14] rounded-[2rem] p-8 md:p-14 overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl transition-transform duration-500 group-hover/hero:scale-[1.01]">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none group-hover/hero:bg-indigo-500/20 transition-colors duration-700"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none group-hover/hero:bg-purple-500/20 transition-colors duration-700"></div>
              
              <div className="flex-1 relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-full uppercase tracking-widest mb-6 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Flagship Product
                </div>
                
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-5 tracking-tight leading-tight">
                  AI Interview Simulator
                </h2>
                
                <p className="text-indigo-100/70 text-lg leading-relaxed mb-6">
                  Run high-stress, company-specific mock rounds. We dynamically tailor <strong>6 distinct interview types</strong> to your target role's exact Job Description, your actual resume experience, and the company's specific interview culture and difficulty tier.
                </p>
                
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <button onClick={() => navigate('/study-prep-center/interviews')} className="bg-white hover:bg-indigo-50 text-indigo-950 px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                    <Play className="w-5 h-5 fill-indigo-950" />
                    Launch Simulation
                  </button>
                  <button onClick={() => setIsTypesModalOpen(true)} className="px-6 py-4 rounded-xl border border-white/20 text-white font-bold hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Layers className="w-5 h-5" /> Explore Round Types
                  </button>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-semibold w-fit">
                    <Target className="w-3.5 h-3.5" /> Evaluated on FAANG Rubrics
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-semibold w-fit">
                    <Zap className="w-3.5 h-3.5" /> Real-time Voice Interaction
                  </div>
                </div>
              </div>
              
              {/* Interactive Graphic showing all 6 types */}
              <div className="hidden lg:flex w-96 h-96 relative items-center justify-center shrink-0">
                <div className="absolute inset-0 border-[2px] border-indigo-500/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
                <div className="absolute inset-10 border-[2px] border-dashed border-purple-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                <div className="absolute inset-20 border-[2px] border-indigo-400/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                
                <div className="w-28 h-28 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(99,102,241,0.6)] animate-pulse relative z-10">
                  <Rocket className="w-12 h-12 text-white" />
                </div>
                
                {/* 6 Floating Badges */}
                <div className="absolute top-2 right-12 bg-[#1a1c1d] border border-white/10 px-3 py-1.5 rounded-lg shadow-2xl animate-float-icon" style={{ animationDelay: '0ms' }}>
                  <span className="text-emerald-400 text-xs font-bold font-mono tracking-wider text-shadow-glow">System Design</span>
                </div>
                <div className="absolute bottom-6 left-12 bg-[#1a1c1d] border border-white/10 px-3 py-1.5 rounded-lg shadow-2xl animate-float-icon" style={{ animationDelay: '500ms' }}>
                  <span className="text-amber-400 text-xs font-bold font-mono tracking-wider text-shadow-glow">Behavioral</span>
                </div>
                <div className="absolute top-16 left-6 bg-[#1a1c1d] border border-white/10 px-3 py-1.5 rounded-lg shadow-2xl animate-float-icon" style={{ animationDelay: '1200ms' }}>
                  <span className="text-indigo-400 text-xs font-bold font-mono tracking-wider text-shadow-glow">DSA Patterns</span>
                </div>
                <div className="absolute bottom-16 right-6 bg-[#1a1c1d] border border-white/10 px-3 py-1.5 rounded-lg shadow-2xl animate-float-icon" style={{ animationDelay: '800ms' }}>
                  <span className="text-rose-400 text-xs font-bold font-mono tracking-wider text-shadow-glow">Resume Deep Dive</span>
                </div>
                <div className="absolute top-1/2 -left-6 -translate-y-1/2 bg-[#1a1c1d] border border-white/10 px-3 py-1.5 rounded-lg shadow-2xl animate-float-icon" style={{ animationDelay: '300ms' }}>
                  <span className="text-blue-400 text-xs font-bold font-mono tracking-wider text-shadow-glow">Technical Q's</span>
                </div>
                <div className="absolute top-1/2 -right-6 -translate-y-1/2 bg-[#1a1c1d] border border-white/10 px-3 py-1.5 rounded-lg shadow-2xl animate-float-icon" style={{ animationDelay: '1600ms' }}>
                  <span className="text-purple-400 text-xs font-bold font-mono tracking-wider text-shadow-glow">LLD & OOP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between animate-spring-up group/card border border-slate-200/60 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300/50 transition-all duration-300" style={{ animationDelay: '200ms' }}>
              <div className="ambient-glow top-1/2 right-0 bg-gradient-to-l from-blue-500/10 to-transparent blur-3xl w-64 h-64 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 border border-blue-100/50 flex items-center justify-center text-blue-600 shadow-sm group-hover/card:scale-110 group-hover/card:rotate-3 transition-transform duration-500">
                    <Map className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#1a1c1d]">Skill Roadmaps</h2>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gap Analysis</span>
                  </div>
                </div>
                <p className="text-[#464553] text-base leading-relaxed mb-8">
                  Algorithms analyze your profile against job descriptions to pinpoint structural gaps and generate highly personalized learning paths.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/study-prep-center/roadmaps')} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-100 hover:border-blue-200 font-bold text-sm transition-all group/btn shadow-sm">
                  View Active Roadmaps
                  <ArrowLeft className="w-4 h-4 rotate-180 group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => navigate('/study-prep-center/skill-gap')} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-100 hover:border-blue-200 font-bold text-sm transition-all group/btn shadow-sm">
                  Run New Gap Analysis
                  <ArrowLeft className="w-4 h-4 rotate-180 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between animate-spring-up group/card border border-slate-200/60 hover:shadow-xl hover:-translate-y-1 hover:border-purple-300/50 transition-all duration-300" style={{ animationDelay: '300ms' }}>
              <div className="ambient-glow bottom-0 left-1/4 bg-gradient-to-r from-purple-500/10 to-transparent blur-3xl w-64 h-64 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-slate-100 border border-purple-100/50 flex items-center justify-center text-purple-600 shadow-sm group-hover/card:scale-110 group-hover/card:-rotate-3 transition-transform duration-500">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#1a1c1d]">Course Catalog</h2>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      420+ Curated Modules
                    </span>
                  </div>
                </div>
                <p className="text-[#464553] text-base leading-relaxed mb-8">
                  Access a high-signal repository focusing exclusively on industry-standard technologies and architectures for senior-level engineering and product roles.
                </p>
              </div>
              <button 
                onClick={() => navigate('/study-prep-center/catalog')}
                className="w-full mt-auto flex justify-center items-center gap-2 bg-[#0f0f14] hover:bg-purple-900 text-white py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 group/btn"
              >
                <span>Explore Catalog</span>
                <ArrowLeft className="w-4 h-4 rotate-180 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Round Types Modal */}
      <Modal isOpen={isTypesModalOpen} onClose={() => setIsTypesModalOpen(false)} title="Tailored Interview Rounds" size="lg">
        <div className="p-2">
          <p className="text-slate-500 text-sm mb-6">
            Our AI engine dynamically generates fully contextualized rounds tailored to your target company. Here are the 6 distinct interview modules available in the simulator:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROUND_TYPES.map(round => (
              <div key={round.id} className="flex gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${round.bg} ${round.color}`}>
                  {round.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{round.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {round.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => {
                setIsTypesModalOpen(false)
                navigate('/study-prep-center/interview-prep')
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-colors"
            >
              Start Generating Simulation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
