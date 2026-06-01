import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import {
  ArrowLeft, Code, GitBranch, Brain, Users, LayoutGrid, BookOpen,
  Clock, Zap, BookMarked, TrendingUp, Target, Play, Trophy, Loader2
} from 'lucide-react'

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

export default function InterviewSessionPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getInterviewSession(sessionId)
      .then(data => setSession(data))
      .catch(e => setError(e.message || 'Failed to load session'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 font-semibold">{error || 'Session not found'}</p>
        <button onClick={() => navigate('/study-prep-center/interviews')} className="mt-4 px-5 py-2 bg-slate-900 text-white rounded-xl font-semibold text-sm">
          Back to My Interviews
        </button>
      </div>
    )
  }

  const { prep_data, evaluations = [] } = session
  const rounds = prep_data?.rounds || []
  const meta = prep_data?.meta || {}

  // Stats
  const questionsDone = evaluations.length
  const totalQuestions = meta.total_questions || 0
  const avgScore = evaluations.length > 0
    ? (evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / evaluations.length).toFixed(1)
    : null

  // Build eval map for per-round completion
  const evalMap = {}
  evaluations.forEach(e => {
    if (!evalMap[e.round_id]) evalMap[e.round_id] = { count: 0, totalScore: 0 }
    evalMap[e.round_id].count++
    evalMap[e.round_id].totalScore += e.score || 0
  })

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Back */}
      <button
        onClick={() => navigate('/study-prep-center/interviews')}
        className="mb-6 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> My Interviews
      </button>

      {/* Header card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                session.company_tier === 'faang' ? 'bg-amber-400/20 text-amber-400' :
                session.company_tier === 'unicorn' ? 'bg-violet-400/20 text-violet-400' :
                'bg-slate-600 text-slate-300'
              }`}>
                {meta.company_tier_label || 'Tech Company'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-slate-700/60 text-slate-400 capitalize">
                {session.difficulty}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">{session.job_title}</h1>
            <p className="text-slate-400 font-medium">{session.company}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-4 flex-wrap">
            <Stat icon={<Target className="w-4 h-4" />} label="Progress" value={`${questionsDone}/${totalQuestions}`} color="text-blue-400" />
            <Stat icon={<TrendingUp className="w-4 h-4" />} label="Avg Score" value={avgScore ? `${avgScore}/10` : '—'} color="text-emerald-400" />
            <Stat icon={<Clock className="w-4 h-4" />} label="Est. Hours" value={meta.estimated_total_hours ? `${meta.estimated_total_hours}h` : '—'} color="text-violet-400" />
          </div>
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Interview Rounds</h2>
        <span className="text-sm text-slate-500">{rounds.length} rounds · {totalQuestions} questions</span>
      </div>

      {/* Rounds grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rounds.map(round => {
          const Icon = ROUND_ICONS[round.id] || Code
          const roundEvals = evalMap[round.id] || { count: 0, totalScore: 0 }
          const roundQCount = round.questions?.length || 0
          const roundAvg = roundEvals.count > 0 ? (roundEvals.totalScore / roundEvals.count).toFixed(1) : null
          const progressPct = roundQCount > 0 ? Math.round((roundEvals.count / roundQCount) * 100) : 0

          return (
            <RoundCard
              key={round.id}
              round={round}
              Icon={Icon}
              progressPct={progressPct}
              doneCount={roundEvals.count}
              totalCount={roundQCount}
              avgScore={roundAvg}
              defaultMode={session.default_mode}
              onStudy={() => navigate(`/study-prep-center/interview-prep/${sessionId}/round/${round.id}?mode=study`)}
              onMock={() => navigate(`/study-prep-center/interview-prep/${sessionId}/round/${round.id}?mode=mock`)}
            />
          )
        })}
      </div>
    </div>
  )
}

function Stat({ icon, label, value, color }) {
  return (
    <div className="bg-slate-800/60 rounded-2xl px-5 py-4 text-center min-w-[90px]">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
    </div>
  )
}

function RoundCard({ round, Icon, progressPct, doneCount, totalCount, avgScore, defaultMode, onStudy, onMock }) {
  const displayTags = (round.tags || []).slice(0, 4)

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: round.accent_color }}
    >
      <div className="p-6">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: round.accent_color + '18' }}
            >
              <Icon className="w-5 h-5" style={{ color: round.accent_color }} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{round.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[round.difficulty] || DIFFICULTY_COLORS.Medium}`}>
                  {round.difficulty}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{round.estimated_minutes} min
                </span>
              </div>
            </div>
          </div>
          {avgScore && (
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl text-sm font-bold">
              <Trophy className="w-3.5 h-3.5" />{avgScore}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {displayTags.map(tag => (
            <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
              {tag}
            </span>
          ))}
          {round.tags?.length > 4 && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-400 text-xs font-semibold rounded-full">
              +{round.tags.length - 4} more
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>{doneCount} of {totalCount} answered</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: round.accent_color }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onStudy}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookMarked className="w-4 h-4" /> Study
          </button>
          <button
            onClick={onMock}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer text-white shadow-md hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${round.accent_color}, ${round.accent_color}cc)` }}
          >
            <Play className="w-4 h-4" /> Mock
          </button>
        </div>
      </div>
    </div>
  )
}
