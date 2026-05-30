import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/utils'
import EnrollmentModal from '../components/study_center/EnrollmentModal'
import { Clock, PlayCircle, CheckCircle, Lock, BookOpen } from 'lucide-react'

export default function CourseOverview() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()
  
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchCourse = async () => {
    try {
      const data = await api.getCourseDetail(courseId)
      setCourse(data)
    } catch (err) {
      error(err.message || 'Failed to load course details')
      navigate('/study-center')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchCourse()
  }, [user, courseId])

  const handleEnrollClick = () => {
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 min-h-screen p-8 animate-pulse">
        <div className="h-8 w-32 bg-slate-200 rounded mb-8"></div>
        <div className="h-64 bg-slate-200 rounded-[2rem] mb-12"></div>
        <div className="space-y-4 max-w-4xl mx-auto">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white rounded-2xl"></div>)}
        </div>
      </div>
    )
  }

  if (!course) return null

  const getRemainingTime = (expiresAt) => {
    if (!expiresAt) return 'Lifetime access'
    const diff = new Date(expiresAt) - new Date()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    if (days > 0) return `${days} days, ${hours} hours left`
    return `${hours} hours left`
  }

  const progressPercent = Math.max(0, Math.round((course.completed_count / course.chapter_count) * 100))
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="flex-1 bg-[#f8fafc] min-h-screen pb-24 font-sans">
      
      {/* Premium Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 pt-8 pb-32 px-8 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full bg-indigo-500 blur-[100px]"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-purple-500 blur-[100px]"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <Link to="/study-center" className="inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-white mb-10 font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Study Center
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-4">
                {course.tags?.map(t => (
                  <span key={t} className="px-3 py-1 bg-white/10 text-indigo-200 rounded-full text-xs font-bold uppercase tracking-widest border border-white/5 backdrop-blur-md">
                    {t}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                {course.title}
              </h1>
              <p className="text-indigo-100/80 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed font-light">
                {course.description}
              </p>
              
              {!course.is_enrolled ? (
                <div className="flex flex-col items-start gap-5">
                  {course.is_expired && (
                    <div className="px-4 py-3 bg-red-500/10 text-red-300 border border-red-500/20 rounded-xl text-sm font-medium flex items-center gap-3 backdrop-blur-md shadow-sm">
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Your subscription is over. Please get a new plan or renew to continue accessing the course.
                    </div>
                  )}
                  <button 
                    onClick={handleEnrollClick}
                    className="cursor-pointer group relative inline-flex items-center justify-center px-8 py-4 bg-white text-indigo-950 font-bold rounded-2xl hover:bg-indigo-50 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] transform hover:-translate-y-1"
                  >
                    <span className="flex items-center gap-2">
                      <PlayCircle className="w-5 h-5 text-indigo-600" />
                      {course.is_expired ? 'Renew Course Access' : 'Unlock Full Course'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2 px-5 py-3 bg-green-500/20 text-green-300 rounded-2xl font-semibold border border-green-500/30 backdrop-blur-md shadow-sm">
                    <CheckCircle className="w-5 h-5" />
                    Enrolled
                  </span>
                  {course.enrollment_expires_at ? (
                    <div className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500/20 text-amber-200 rounded-2xl font-semibold border border-amber-500/30 backdrop-blur-md shadow-sm">
                      <Clock className="w-5 h-5" />
                      {getRemainingTime(course.enrollment_expires_at)}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 text-white rounded-2xl font-semibold border border-white/20 backdrop-blur-md shadow-sm">
                      <Clock className="w-5 h-5 opacity-70" />
                      Lifetime Access
                    </div>
                  )}
                  <button 
                    onClick={handleEnrollClick}
                    className="cursor-pointer ml-2 text-sm font-bold text-indigo-300 hover:text-white transition-colors underline underline-offset-4 decoration-indigo-500/50 hover:decoration-white"
                  >
                    Extend Time
                  </button>
                </div>
              )}
            </div>

            {/* Progress Circular Widget (Only if enrolled) */}
            {course.is_enrolled && (
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-500">
                <div className="relative flex items-center justify-center">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="80" cy="80" r="45" stroke="currentColor" strokeWidth="10" fill="transparent" 
                      className="text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)] transition-all duration-1000 ease-out"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-white tracking-tighter">{progressPercent}%</span>
                  </div>
                </div>
                <div className="mt-6 text-sm text-indigo-200 font-semibold tracking-wide uppercase">
                  {course.completed_count} of {course.chapter_count} Completed
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-8 -mt-16 relative z-20">
        
        {/* Course Stats Bar */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6 flex items-center justify-around mb-12 backdrop-blur-xl">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chapters</p>
            <p className="text-2xl font-bold text-slate-900">{course.chapter_count}</p>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Format</p>
            <p className="text-2xl font-bold text-slate-900 flex items-center gap-2 justify-center">
              <BookOpen className="w-5 h-5 text-indigo-500" /> Read
            </p>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Access</p>
            <p className="text-2xl font-bold text-slate-900">{course.is_enrolled ? 'Unlocked' : 'Premium'}</p>
          </div>
        </div>

        {/* Syllabus / Table of Contents */}
        <div>
          <h2 className="text-2xl font-bold mb-8 text-slate-900 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </span>
            Course Syllabus
          </h2>
          
          <div className="flex flex-col gap-3">
            {course.chapters?.map((ch, idx) => (
              <Link
                key={ch.chapter_id}
                to={ch.is_locked ? '#' : `/study-center/${course.course_id}/chapters/${ch.chapter_id}`}
                className={cn(
                  "group relative overflow-hidden flex items-center p-5 rounded-2xl transition-all duration-300",
                  ch.is_locked 
                    ? "bg-slate-50 border border-slate-100 opacity-70 cursor-not-allowed" 
                    : "bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer transform hover:-translate-y-0.5"
                )}
              >
                {/* Active Hover Gradient */}
                {!ch.is_locked && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                )}

                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm mr-5 flex-shrink-0 z-10 transition-colors",
                  ch.is_completed ? "bg-green-100 text-green-700" : 
                  ch.is_locked ? "bg-slate-200 text-slate-500" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                )}>
                  {ch.is_completed ? <CheckCircle className="w-5 h-5" /> : idx.toString().padStart(2, '0')}
                </div>
                
                <div className="flex-1 font-semibold text-lg text-slate-900 group-hover:text-indigo-900 transition-colors z-10 truncate pr-4">
                  {ch.title}
                </div>
                
                <div className="flex items-center gap-4 z-10">
                  {ch.is_free && !ch.is_completed && !course.is_enrolled && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">
                      Free Preview
                    </span>
                  )}
                  
                  {ch.is_locked ? (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  ) : ch.is_completed ? (
                    <span className="text-sm font-bold text-green-600 hidden sm:block">Completed</span>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      <EnrollmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        course={course}
        onEnrollSuccess={fetchCourse}
      />
    </div>
  )
}
