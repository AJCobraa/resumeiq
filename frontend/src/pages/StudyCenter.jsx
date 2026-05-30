import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/utils'

export default function StudyCenter() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const { user } = useAuth()
  const { error } = useToast()

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await api.getCourses()
        setCourses(data)
      } catch (err) {
        error('Failed to load courses')
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchCourses()
  }, [user, error])

  const filteredCourses = filter === 'All' 
    ? courses 
    : courses.filter(c => c.tags?.includes(filter.toLowerCase()))

  return (
    <div className="flex-1 bg-[#fcfcfd] min-h-screen pb-20">
      {/* Header Area */}
      <div className="pt-12 pb-12 px-8 bg-gradient-to-br from-indigo-50/50 to-white border-b border-border-default">
        <div className="max-w-5xl mx-auto flex flex-col">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mb-8 font-medium transition-colors bg-white/50 px-4 py-2 rounded-full border border-indigo-100 w-fit hover:shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            Study Center
          </h1>
          <p className="text-lg text-text-muted max-w-2xl">
            Master system design and OOD interviews with step-by-step visual guides. Complete courses to earn certificates and level up your skills.
          </p>
          
          {/* Tag Filters */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['All', 'System-Design', 'OOD', 'Interviews'].map((tag) => (
              <button className="cursor-pointer"
                key={tag}
                onClick={() => setFilter(tag)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  filter === tag
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-bg-elevated text-text-muted hover:bg-bg-card hover:text-text-primary border border-border-default"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-border-default rounded-2xl h-80"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredCourses.map((course) => (
              <div key={course.course_id} className="group bg-white border border-border-default rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-300 flex flex-col">
                {/* Card Graphic */}
                <div className="h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6 border-b border-border-default">
                   <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                     {course.course_id === 'system-design' ? (
                       <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                       </svg>
                     ) : (
                       <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2-1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                       </svg>
                     )}
                   </div>
                </div>
                
                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-xl font-bold text-text-primary group-hover:text-indigo-600 transition-colors">
                      {course.title}
                    </h2>
                    {course.coin_cost > 0 && !course.is_enrolled && (
                      <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Premium
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-text-muted mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    {course.tags?.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-bg-elevated text-text-muted rounded text-xs">
                        #{t}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-default">
                    <div className="flex items-center gap-2 text-sm text-text-muted font-medium">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {course.chapter_count} Chapters
                    </div>
                    
                    <Link 
                      to={`/study-center/${course.course_id}`}
                      className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      {course.is_enrolled ? 'Continue Learning' : 'View Course'}
                    </Link>
                  </div>
                  
                  {course.is_enrolled && (
                    <div className="mt-4 pt-2">
                      <div className="flex justify-between text-xs text-text-muted mb-1 font-medium">
                        <span>Progress</span>
                        <span>{course.completed_count} / {course.chapter_count}</span>
                      </div>
                      <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(2, (course.completed_count / course.chapter_count) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
