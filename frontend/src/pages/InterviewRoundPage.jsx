import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import {
  ArrowLeft, Code, GitBranch, Brain, Users, LayoutGrid, BookOpen,
  Clock, Zap, CheckCircle2, AlertCircle, Lightbulb, Link as LinkIcon,
  ChevronRight, RefreshCw, XCircle, ArrowRight, CornerDownRight, Mic, Loader2, TrendingUp, Trophy
} from 'lucide-react'
import { cn } from '../lib/utils'

const ROUND_ICONS = {
  technical: Code,
  system_design: GitBranch,
  dsa: Brain,
  behavioral: Users,
  lld: LayoutGrid,
  resume_deep_dive: BookOpen,
}

const DIFFICULTY_COLORS = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Hard: 'bg-red-50 text-red-700 border-red-200',
}

export default function InterviewRoundPage() {
  const { sessionId, roundId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const mode = searchParams.get('mode') || 'study' // 'study' | 'mock'

  const [session, setSession] = useState(null)
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Mock Mode state
  const [mockIndex, setMockIndex] = useState(0)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentEval, setCurrentEval] = useState(null)
  const [showNudge, setShowNudge] = useState(false)
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0) // in seconds
  const [timerActive, setTimerActive] = useState(false)
  const timerRef = useRef(null)

  // Audio Mode state
  const [audioMode, setAudioMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = false

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            }
          }
          if (finalTranscript) {
            setAnswerText(prev => (prev + ' ' + finalTranscript).trim())
          }
        }

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error)
          setIsListening(false)
        }
        
        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    api.getInterviewSession(sessionId)
      .then(data => {
        setSession(data)
        // Filter evaluations just for this round
        const roundEvals = (data.evaluations || []).filter(e => e.round_id === roundId)
        setEvaluations(roundEvals)
        
        // In mock mode, find the first unanswered question
        if (mode === 'mock') {
          const round = data.prep_data?.rounds?.find(r => r.id === roundId)
          if (round) {
            const answeredIds = new Set(roundEvals.map(e => e.question_id))
            const firstUnanswered = round.questions.findIndex(q => !answeredIds.has(q.id))
            setMockIndex(firstUnanswered >= 0 ? firstUnanswered : 0)
            
            // Set timer based on estimated minutes per question
            const minsPerQ = Math.max(1, Math.round(round.estimated_minutes / round.questions.length))
            setTimeLeft(minsPerQ * 60)
            setTimerActive(true)
          }
        }
      })
      .catch(e => setError(e.message || 'Failed to load session'))
      .finally(() => setLoading(false))
  }, [sessionId, roundId, mode])

  // Timer effect
  useEffect(() => {
    if (timerActive && timeLeft > 0 && !currentEval && mode === 'mock') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerActive, timeLeft, currentEval, mode])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <div className="w-8 h-8 animate-spin text-indigo-600 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
      </div>
    )
  }

  if (error || !session) return <div className="p-12 text-center text-red-600 font-bold">{error}</div>

  const round = session.prep_data?.rounds?.find(r => r.id === roundId)
  if (!round) return <div className="p-12 text-center text-slate-500 font-bold">Round not found</div>

  const Icon = ROUND_ICONS[round.id] || Code
  const isTimeCritical = timeLeft > 0 && timeLeft <= 180 // <= 3 minutes
  const isTimeUp = timeLeft === 0

  const handleModeSwitch = (newMode) => {
    setSearchParams({ mode: newMode })
    // Reset state when switching
    setAnswerText('')
    setCurrentEval(null)
    setShowNudge(false)
    if (newMode === 'mock') {
      const answeredIds = new Set(evaluations.map(e => e.question_id))
      const firstUnanswered = round.questions.findIndex(q => !answeredIds.has(q.id))
      setMockIndex(firstUnanswered >= 0 ? firstUnanswered : 0)
      const minsPerQ = Math.max(1, Math.round(round.estimated_minutes / round.questions.length))
      setTimeLeft(minsPerQ * 60)
      setTimerActive(true)
    } else {
      setTimerActive(false)
    }
  }

  const handleSubmit = async () => {
    if (!answerText.trim() || answerText.length < 10) return
    setSubmitting(true)
    setTimerActive(false) // Pause timer
    
    try {
      const q = round.questions[mockIndex]
      const result = await api.evaluateAnswer(session.id, {
        round_id: round.id,
        question_id: q.id,
        answer_text: answerText
      })
      setCurrentEval(result)
      // Add to local eval list
      setEvaluations(prev => [...prev, { round_id: round.id, question_id: q.id, score: result.score }])
    } catch (err) {
      alert(err.message || 'Evaluation failed')
      setTimerActive(true) // Resume timer if failed
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextMock = () => {
    if (mockIndex < round.questions.length - 1) {
      setMockIndex(prev => prev + 1)
      setAnswerText('')
      setCurrentEval(null)
      setShowNudge(false)
      // Reset timer
      const minsPerQ = Math.max(1, Math.round(round.estimated_minutes / round.questions.length))
      setTimeLeft(minsPerQ * 60)
      setTimerActive(true)
    } else {
      // Done with round
      navigate(`/study-prep-center/interview-prep/${sessionId}`)
    }
  }

  const handleRetryMock = () => {
    setAnswerText('')
    setCurrentEval(null)
    // Reset timer
    const minsPerQ = Math.max(1, Math.round(round.estimated_minutes / round.questions.length))
    setTimeLeft(minsPerQ * 60)
    setTimerActive(true)
  }

  // ── STUDY MODE RENDER ──────────────────────────────────────────────────
  if (mode === 'study') {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        {/* Header strip */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/study-prep-center/interview-prep/${sessionId}`)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: round.accent_color + '22' }}
            >
              <Icon className="w-5 h-5" style={{ color: round.accent_color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{round.name}</h1>
              <p className="text-sm text-slate-500 font-medium">Study Mode · {round.questions.length} Questions</p>
            </div>
          </div>
          <button
            onClick={() => handleModeSwitch('mock')}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${round.accent_color}, ${round.accent_color}dd)` }}
          >
            <Zap className="w-4 h-4" /> Start Mock Mode
          </button>
        </div>

        <div className="space-y-6">
          {round.questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.Medium}`}>
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
                        {q.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">{q.text}</h3>
                  </div>
                </div>

                <div className="pl-12 space-y-4">
                  {/* Key Concepts */}
                  <div className="flex flex-wrap gap-1.5">
                    {(q.key_concepts || []).map(concept => (
                      <span key={concept} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-100">
                        {concept}
                      </span>
                    ))}
                  </div>

                  {/* Study Focus */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed">
                    <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-violet-500" /> Study Focus
                    </p>
                    {q.study_focus}
                  </div>

                  {/* Resources (DSA) */}
                  {q.resources?.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <LinkIcon className="w-3.5 h-3.5" /> Practice Resources
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {q.resources.map(res => (
                          <a
                            key={res.url}
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm rounded-lg text-sm font-semibold text-slate-700 transition-all"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: res.platform === 'leetcode' ? '#f59e0b' : '#3b82f6' }} />
                            {res.label}
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── MOCK MODE RENDER ───────────────────────────────────────────────────
  const q = round.questions[mockIndex]
  if (!q) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Round Complete!</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">You've answered all {round.questions.length} questions in this round.</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate(`/study-prep-center/interview-prep/${sessionId}`)}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Back to Rounds
          </button>
          <button
            onClick={() => handleModeSwitch('study')}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:border-slate-300 transition-colors"
          >
            Review in Study Mode
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-4 md:py-6 px-4 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <button
          onClick={() => navigate(`/study-prep-center/interview-prep/${sessionId}`)}
          className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
        >
          <XCircle className="w-4 h-4" /> End Mock
        </button>
        
        {/* Toggle Mode */}
        {!currentEval && (
          <div className="bg-slate-100 rounded-full p-1 flex gap-1 items-center">
            <button
              onClick={() => setAudioMode(false)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", !audioMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              Text Mode
            </button>
            <button
              onClick={() => setAudioMode(true)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1", audioMode ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500")}
            >
              <Mic className="w-3.5 h-3.5" /> Voice Mode
            </button>
          </div>
        )}

        {/* Timer */}
        {!currentEval && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm font-bold border transition-colors",
            isTimeUp ? "bg-red-100 border-red-200 text-red-700 animate-pulse" :
            isTimeCritical ? "bg-amber-50 border-amber-200 text-amber-700" :
            "bg-white border-slate-200 text-slate-700"
          )}>
            <Clock className={cn("w-4 h-4", isTimeCritical && !isTimeUp && "animate-pulse")} />
            {formatTime(timeLeft)}
          </div>
        )}
        {currentEval && (
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Evaluated
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-8 flex-shrink-0">
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
          <span>{round.name}</span>
          <span>Question {mockIndex + 1} of {round.questions.length}</span>
        </div>
        <div className="flex gap-1 h-1.5">
          {round.questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-full",
                i < mockIndex || (i === mockIndex && currentEval) ? "bg-emerald-400" :
                i === mockIndex ? "bg-violet-500" :
                "bg-slate-100"
              )}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        
        {/* Question Card */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm mb-4 flex-shrink-0 z-10 relative">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border uppercase", DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.Medium)}>
              {q.difficulty}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
              {q.category}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">{q.text}</h2>
          
          {isTimeUp && !currentEval && !submitting && (
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4" /> Time's up — but you can still finish your thought and submit.
            </div>
          )}
        </div>

        {/* Workspace: EITHER Input OR Feedback */}
        <div className="flex-1 min-h-0 relative">
          {!currentEval ? (
            // INPUT MODE
            <div className="absolute inset-0 flex flex-col bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
              {/* Nudge Bar */}
              <div className="border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-between">
                <button
                  onClick={() => setShowNudge(!showNudge)}
                  className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> Need a nudge?
                </button>
                {showNudge && (
                  <p className="text-sm font-medium text-slate-700 animate-in fade-in slide-in-from-top-1 pl-4 flex-1">
                    {q.nudge}
                  </p>
                )}
              </div>
              
              {audioMode ? (
                // Audio UI
                <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 text-center bg-slate-50">
                  <button 
                    onClick={() => {
                      if (isListening) {
                        recognitionRef.current?.stop()
                      } else {
                        if (answerText === "This is a simulated transcript from the voice session.") {
                          setAnswerText('')
                        }
                        try {
                          recognitionRef.current?.start()
                          setIsListening(true)
                        } catch (err) {
                          alert("Microphone access denied or not supported by this browser.")
                        }
                      }
                    }}
                    className={cn("w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 shadow-inner border-4 transition-all cursor-pointer hover:scale-105", 
                      isListening ? "bg-red-100 text-red-600 border-red-200 animate-pulse shadow-red-500/20 shadow-xl" : "bg-indigo-100 text-indigo-600 border-white hover:bg-indigo-200"
                    )}
                  >
                    <Mic className="w-8 h-8 md:w-10 md:h-10" />
                  </button>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                    {isListening ? "Listening..." : "Tap to Speak"}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4 md:mb-6 max-w-sm">
                    {isListening ? "Speak clearly into your microphone." : "We'll transcribe your answer automatically."}
                  </p>
                  
                  <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 p-3 md:p-4 min-h-[80px] md:min-h-[100px] text-left mb-4 md:mb-6 text-sm md:text-base text-slate-700 whitespace-pre-wrap shadow-sm overflow-y-auto max-h-[150px] custom-scrollbar">
                    {answerText || <span className="text-slate-400 italic">Your transcript will appear here...</span>}
                  </div>

                  <button
                    onClick={() => {
                      if (isListening) recognitionRef.current?.stop()
                      setAudioMode(false)
                    }}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm md:text-base font-bold hover:bg-slate-800 transition-colors"
                  >
                    Use this Transcript
                  </button>
                </div>
              ) : (
                // Text UI
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="Think out loud, structure your response..."
                  className="flex-1 w-full p-4 md:p-6 bg-transparent resize-none outline-none text-slate-700 text-base md:text-lg leading-relaxed placeholder:text-slate-300"
                  disabled={submitting}
                />
              )}
              
              {/* Submit Bar */}
              {!audioMode && (
                <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center">
                  <span className={cn("text-xs font-semibold", answerText.length < 10 ? "text-slate-400" : "text-emerald-600")}>
                    {answerText.length} chars
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || answerText.length < 10}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</> : 'Submit Answer'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // FEEDBACK MODE
            <div className="absolute inset-0 overflow-y-auto pr-2 custom-scrollbar pb-6 md:pb-10">
              <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl text-slate-200">
                {/* Score Header */}
                <div className="flex items-center gap-4 md:gap-6 mb-6">
                  <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#334155" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={currentEval.score >= 8 ? '#10b981' : currentEval.score >= 5 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${currentEval.score * 10}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-bold text-white leading-none">{currentEval.score}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white mb-1">AI Evaluation</p>
                    <p className="text-slate-400 leading-relaxed">{currentEval.summary}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Covered Well */}
                  {currentEval.covered?.length > 0 && (
                    <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-5">
                      <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Covered Well
                      </h4>
                      <ul className="space-y-2">
                        {currentEval.covered.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-emerald-100/80">
                            <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing */}
                  {currentEval.missing?.length > 0 && (
                    <div className="bg-amber-950/30 border border-amber-900/50 rounded-2xl p-5">
                      <h4 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Missed Opportunities
                      </h4>
                      <ul className="space-y-2">
                        {currentEval.missing.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-100/80">
                            <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strengthen */}
                  {currentEval.strengthen?.length > 0 && (
                    <div className="bg-blue-950/30 border border-blue-900/50 rounded-2xl p-5">
                      <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> How to Strengthen
                      </h4>
                      <ul className="space-y-3">
                        {currentEval.strengthen.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-blue-100/80 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => navigate(`/study-prep-center/interview-prep/${sessionId}`)}
                      className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-all flex items-center gap-2"
                    >
                      <LayoutGrid className="w-4 h-4" /> Rounds
                    </button>
                    <button
                      onClick={handleRetryMock}
                      className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                  </div>
                  
                  <button
                    onClick={handleNextMock}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                  >
                    {mockIndex < round.questions.length - 1 ? 'Next Question' : 'Finish Round'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
