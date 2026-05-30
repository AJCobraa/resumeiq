import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import mermaid from 'mermaid'

import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { cn } from '../lib/utils'

// Placeholder for Diagram component (we will implement it shortly)
import DiagramBlock from '../components/diagrams/DiagramBlock'

const Mermaid = ({ chart }) => {
  const ref = useRef(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default'
    })
    if (ref.current) {
      // Use a unique ID to avoid collisions
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
      mermaid.render(id, chart).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      }).catch(err => {
        console.error('Mermaid render error', err)
      })
    }
  }, [chart])

  return <div ref={ref} className="mermaid-wrapper my-8 flex justify-center bg-white p-4 rounded-xl border shadow-sm overflow-x-auto" />
}

export default function ChapterReader() {
  const { courseId, chapterId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()
  
  const [course, setCourse] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  
  const mainRef = useRef(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [cData, chData] = await Promise.all([
          api.getCourseDetail(courseId),
          api.getChapter(courseId, chapterId)
        ])
        setCourse(cData)
        setChapter(chData)
      } catch (err) {
        error(err.message || 'Access denied')
        navigate(`/study-center/${courseId}`)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchData()
  }, [user, courseId, chapterId, navigate, error])

  const handleScroll = (e) => {
    const el = e.target
    const scrollHeight = el.scrollHeight - el.clientHeight
    if (scrollHeight > 0) {
      const progress = (el.scrollTop / scrollHeight) * 100
      setReadProgress(progress)
    }
  }

  const toggleComplete = async () => {
    setCompleting(true)
    try {
      const res = await api.toggleChapter(courseId, chapterId)
      setChapter(prev => ({ ...prev, is_completed: res.completed }))
      if (res.completed) {
        success('Chapter completed! 🎉')
      } else {
        success('Chapter unmarked')
      }
    } catch (err) {
      error('Failed to toggle completion')
    } finally {
      setCompleting(false)
    }
  }

  if (loading || !course || !chapter) {
    return <div className="flex-1 bg-white min-h-screen p-12 text-center text-text-muted">Loading chapter...</div>
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#fcfcfd] overflow-hidden">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-border-default h-14 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-20 relative">
        <div className="flex items-center gap-4">
          <Link to={`/study-center/${courseId}`} className="p-1.5 rounded hover:bg-bg-elevated transition-colors" title="Back to Course">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="text-sm font-medium text-text-muted truncate hidden sm:block">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate(`/study-center/${courseId}`)}>{course.title}</span> 
            <span className="mx-2">/</span> 
            <span className="text-text-primary">{chapter.title}</span>
          </div>
        </div>
        
        {/* Read Progress Line */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-indigo-600 transition-all duration-150 ease-out" style={{ width: `${readProgress}%` }}></div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar Index */}
        <div className="w-72 bg-[#f8fafc] border-r border-border-default flex-shrink-0 flex flex-col overflow-y-auto hidden md:flex">
          <div className="p-6 border-b border-border-default sticky top-0 bg-[#f8fafc]/90 backdrop-blur z-10">
            <h3 className="font-bold text-text-primary mb-1 truncate">{course.title}</h3>
            <p className="text-xs font-semibold text-indigo-600">{course.completed_count}/{course.chapter_count} Completed</p>
          </div>
          <div className="p-4 space-y-1">
            {course.chapters?.map((ch) => {
              const isActive = ch.chapter_id === chapterId
              return (
                <Link
                  key={ch.chapter_id}
                  to={ch.is_locked ? '#' : `/study-center/${courseId}/chapters/${ch.chapter_id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive ? "bg-indigo-100 text-indigo-800 font-bold" : "text-text-primary hover:bg-white",
                    ch.is_locked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {ch.is_completed ? (
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : ch.is_locked ? (
                    <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-border-default flex-shrink-0"></div>
                  )}
                  <span className="truncate">{ch.title}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Main Reading Area */}
        <div 
          className="flex-1 overflow-y-auto scroll-smooth relative pb-32"
          onScroll={handleScroll}
          ref={mainRef}
        >
          <div className="max-w-[800px] mx-auto px-8 py-16">
            
            <article className="prose prose-indigo prose-lg max-w-none text-text-primary">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '')
                    
                    // Handle Mermaid explicitly
                    if (match && match[1] === 'mermaid') {
                      return <Mermaid chart={String(children).replace(/\n$/, '')} />
                    }
                    
                    // Handle Diagram Tags
                    if (inline && String(children).startsWith('<!-- diagram:')) {
                      const compName = String(children).replace('<!-- diagram:', '').replace('-->', '').trim()
                      return <DiagramBlock component={compName} />
                    }
                    if (!inline && String(children).includes('<!-- diagram:')) {
                      const match = String(children).match(/<!-- diagram:(.*?) -->/)
                      if(match) return <DiagramBlock component={match[1].trim()} />
                    }

                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-xl my-6"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={cn("bg-bg-elevated text-indigo-700 px-1.5 py-0.5 rounded font-mono text-sm", className)} {...props}>
                        {children}
                      </code>
                    )
                  },
                  blockquote({children}) {
                    return (
                      <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/50 py-1.5 pl-4 pr-4 my-8 rounded-r-lg not-prose">
                        <div className="flex gap-3 text-indigo-900">
                          {children}
                        </div>
                      </blockquote>
                    )
                  },
                  table({children}) {
                    return (
                      <div className="overflow-x-auto my-8 border border-border-default rounded-xl">
                        <table className="min-w-full divide-y divide-border-default text-sm text-left m-0">
                          {children}
                        </table>
                      </div>
                    )
                  },
                  th({children}) {
                    return <th className="bg-bg-elevated px-4 py-3 font-semibold text-text-primary">{children}</th>
                  },
                  td({children}) {
                    return <td className="px-4 py-3 border-t border-border-default">{children}</td>
                  }
                }}
              >
                {chapter.content}
              </ReactMarkdown>
            </article>
            
          </div>
          
          {/* Bottom Action Bar */}
          <div className="fixed bottom-0 right-0 md:left-72 left-0 bg-white border-t border-border-default p-4 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button
              onClick={toggleComplete}
              disabled={completing}
              className={`cursor-pointer ${ cn(
                "flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50",
                chapter.is_completed 
                  ? "bg-green-100 text-green-700 hover:bg-green-200" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              ) }`}
            >
              {chapter.is_completed ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Completed
                </>
              ) : (
                'Mark Complete'
              )}
            </button>
            
            {chapter.next_chapter_id ? (
              <button className="cursor-pointer"
                onClick={() => navigate(`/study-center/${courseId}/chapters/${chapter.next_chapter_id}`)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
              >
                Next Chapter →
              </button>
            ) : (
              <button className="cursor-pointer"
                onClick={() => navigate(`/study-center/${courseId}`)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
              >
                Course Overview
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
