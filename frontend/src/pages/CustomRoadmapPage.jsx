import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import ModelSelector from '../components/study_center/ModelSelector'
import ConfirmGenerationModal from '../components/study_center/ConfirmGenerationModal'
import { Map, Loader2, ArrowRight, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react'

export default function CustomRoadmapPage() {
  const navigate = useNavigate()
  
  // Step 1: Basic Info
  const [skillName, setSkillName] = useState('')
  const [roleContext, setRoleContext] = useState('')
  const [experience, setExperience] = useState('intermediate')
  
  // Step 2: Tailoring Questions
  const [step, setStep] = useState(1) // 1: Info, 2: Questions & Model
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // { q1: "Option A" }

  // Step 3: Model Selection & Generation
  const [modelsDict, setModelsDict] = useState({})
  const [model, setModel] = useState('')
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleNextClick = async (e) => {
    e.preventDefault()
    if (!skillName.trim()) return

    setGeneratingQuestions(true)
    try {
      const res = await api.generateRoadmapQuestions({
        skill_name: skillName.trim(),
        role_context: roleContext.trim() || null,
        experience_level: experience
      })
      setQuestions(res.questions || [])
      
      // Initialize empty answers
      const initialAnswers = {}
      ;(res.questions || []).forEach(q => {
        initialAnswers[q.id] = ''
      })
      setAnswers(initialAnswers)
      
      setStep(2)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to generate tailored questions')
    } finally {
      setGeneratingQuestions(false)
    }
  }

  const handleAnswerSelect = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }))
  }

  const handleGenerateClick = (e) => {
    e.preventDefault()
    if (!model) {
      alert("Please select an AI Engine first.")
      return
    }
    
    // Check if all questions are answered
    const unanswered = questions.some(q => !answers[q.id])
    if (unanswered) {
      alert("Please answer all questions to tailor your roadmap.")
      return
    }

    setIsConfirmOpen(true)
  }

  const handleGenerateConfirm = async () => {
    setGenerating(true)
    try {
      const res = await api.generateRoadmap({
        skill_name: skillName.trim(),
        model_key: model,
        roadmap_type: 'CUSTOM',
        experience_level: experience,
        role_context: roleContext.trim() || null,
        answers: answers
      })
      setIsConfirmOpen(false)
      navigate(`/study-prep-center/roadmaps/${res.id}`)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to generate roadmap')
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="mb-6">
        <button onClick={() => navigate('/study-prep-center')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Study Center
        </button>
      </div>
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-indigo-50 text-indigo-600 mb-6 shadow-inner border border-indigo-100/50">
          <Map className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Learn a New Skill</h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
          Generate a highly-structured, interactive learning roadmap for any technical skill, framework, or concept.
        </p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="p-8 sm:p-10 space-y-8 relative z-10">
          
          {/* STEP 1: Basic Info */}
          <div className={step === 2 ? "opacity-50 pointer-events-none" : ""}>
            <h2 className="text-xl font-bold text-slate-800 mb-6">1. What do you want to learn?</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Topic or Skill Name</label>
                <input
                  type="text"
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                  placeholder="e.g. React Native, System Design, GraphQL"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium text-lg shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Current Experience</label>
                  <div className="relative">
                    <select
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-900 font-medium appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="beginner">Beginner (Start from basics)</option>
                      <option value="intermediate">Intermediate (Know the basics)</option>
                      <option value="advanced">Advanced (Deep dive & internals)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Role Context <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={roleContext}
                    onChange={e => setRoleContext(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium shadow-sm"
                  />
                </div>
              </div>
            </div>

            {step === 1 && (
              <div className="mt-10">
                <button
                  onClick={handleNextClick}
                  disabled={!skillName.trim() || generatingQuestions}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgb(79,70,229,0.25)] hover:shadow-[0_8px_25px_rgb(79,70,229,0.35)] active:scale-[0.98]"
                >
                  {generatingQuestions ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing needs...
                    </>
                  ) : (
                    <>
                      Next: Tailor Roadmap
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Questionnaire & Model Selection */}
          {step === 2 && (
            <div className="pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-800">2. Tailor Your Roadmap</h2>
              </div>
              
              <div className="space-y-8 mb-10">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="font-bold text-slate-900 mb-4">{idx + 1}. {q.text}</p>
                    <div className="space-y-3">
                      {q.options.map((opt, oIdx) => (
                        <label key={oIdx} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${answers[q.id] === opt ? 'bg-indigo-50 border-indigo-500 shadow-[0_0_0_1px_#6366f1]' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                          <input 
                            type="radio" 
                            name={`q-${q.id}`} 
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => handleAnswerSelect(q.id, opt)}
                            className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600 focus:ring-offset-0 mr-4"
                          />
                          <span className={`font-medium ${answers[q.id] === opt ? 'text-indigo-900' : 'text-slate-700'}`}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-6">3. Select AI Engine</h2>
              <ModelSelector 
                selectedModel={model} 
                onModelChange={setModel}
                onModelsLoaded={setModelsDict}
                disabled={generating}
              />
              
              <div className="pt-10 flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  disabled={generating}
                  className="px-6 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerateClick}
                  disabled={!model || generating}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgb(79,70,229,0.25)] hover:shadow-[0_8px_25px_rgb(79,70,229,0.35)] active:scale-[0.98]"
                >
                  <Map className="w-5 h-5" />
                  Generate Custom Roadmap
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <ConfirmGenerationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleGenerateConfirm}
        model={modelsDict[model]}
        title={`Generate Roadmap: ${skillName}`}
        actionText="Generate Roadmap"
        generating={generating}
      />
    </div>
  )
}
