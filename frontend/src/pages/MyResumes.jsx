import { useState, useEffect, useCallback, memo, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { TEMPLATE_REGISTRY } from '../lib/templateRegistry'
import { formatDate } from '../lib/utils'

// Components
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'

/**
 * Renders a scaled-down, non-interactive preview of the resume using the actual React template.
 * This ensures the thumbnail is always a 1:1 match for the real document.
 */
const ResumeThumbnail = memo(({ resume }) => {
  const templateId = resume?.templateId || 'cobra'
  const TemplateComponent = TEMPLATE_REGISTRY[templateId]?.component

  if (!TemplateComponent) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="text-[10px] text-slate-400 font-medium">No Preview</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-white overflow-hidden shadow-[inset_0_0_1px_rgba(0,0,0,0.1)]">
      {/* 
         Scale the template to fit the thumbnail. 
         A4 is ~210x297mm. The container is aspect-[1/1.414].
         We scale the "standard" 800px width template down.
      */}
      <div 
        className="absolute top-0 left-0 origin-top-left pointer-events-none select-none"
        style={{ 
          width: '800px', 
          height: '1131px',
          transform: 'scale(var(--thumb-scale, 0.30))',
        }}
      >
        <Suspense fallback={null}>
          <TemplateComponent resume={resume} isThumbnail={true} />
        </Suspense>
      </div>
    </div>
  )
})

const TEMPLATE_BADGE = {
  cobra:     'bg-primary/10 text-primary',
  executive: 'bg-emerald-500/10 text-emerald-600',
  default:   'bg-secondary text-muted-foreground',
}

export default function MyResumes() {
  const navigate = useNavigate()
  const toast = useToast()
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  
  // Modals
  const [isAdding, setIsAdding] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getResumes()
      setResumes(data)
    } catch {
      toast.error('Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }, []) // Fix: empty array stops infinite loop

  useEffect(() => {
    fetchResumes()
  }, [fetchResumes])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    try {
      await api.createResume({ title: newTitle })
      setNewTitle('')
      setIsAdding(false)
      fetchResumes()
      toast.success('Resume created!')
    } catch {
      toast.error('Failed to create resume')
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteResume(deleteId)
      setDeleteId(null)
      fetchResumes()
      toast.success('Resume deleted')
    } catch {
      toast.error('Failed to delete resume')
    }
  }

  const filteredResumes = resumes.filter(r => 
    r.resumeTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.meta?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && resumes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fcfcfd]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcfcfd] p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Resumes</h1>
            <p className="text-slate-500 mt-1.5">Create and manage multiple tailored versions.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text"
                placeholder="Search resumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64 shadow-sm"
              />
            </div>
            <Button onClick={() => setIsImporting(true)} variant="outline" className="shadow-sm">
              Import PDF
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <NewResumeCard onClick={() => setIsAdding(true)} />
          
          <AnimatePresence mode="popLayout">
            {filteredResumes.map((r) => (
              <ResumeCard 
                key={r.resumeId} 
                resume={r} 
                onDelete={() => setDeleteId(r.resumeId)} 
                onEdit={() => navigate(`/resumes/${r.resumeId}`)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="New Resume" size="sm">
        <div className="space-y-4 pt-2">
          <input 
            autoFocus
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            placeholder="e.g., Software Engineer @ Google"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} className="w-full" disabled={!newTitle.trim()}>
            Create Resume
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Resume" size="sm">
        <div className="space-y-6 pt-2">
          <p className="text-sm text-slate-500 leading-relaxed">
            Are you sure? This will permanently remove this resume version. 
            All past analyses using this resume will be preserved but marked as having a deleted source.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setDeleteId(null)} variant="outline" className="flex-1">Cancel</Button>
            <Button onClick={handleDelete} className="flex-1 bg-rose-500 hover:bg-rose-600 border-rose-600">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function NewResumeCard({ onClick }) {
  return (
    <motion.button
      layout
      whileHover={{ y: -4, shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
      onClick={onClick}
      className="group aspect-[1/1.414] rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-4 transition-all hover:border-primary/50 hover:bg-primary/5 shadow-sm"
    >
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-900">Create New</p>
        <p className="text-xs text-slate-500 mt-0.5">Start from blank</p>
      </div>
    </motion.button>
  )
}

function ResumeCard({ resume, onDelete, onEdit }) {
  const badgeClass = TEMPLATE_BADGE[resume.templateId] || TEMPLATE_BADGE.default

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col gap-4"
    >
      {/* Thumbnail Container */}
      <div 
        className="relative aspect-[1/1.414] rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm group-hover:shadow-glow transition-all"
        ref={el => {
          if (el) el.style.setProperty('--thumb-scale', (el.offsetWidth / 800).toFixed(3))
        }}
      >
        <ResumeThumbnail resume={resume} />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button variant="primary" size="sm" onClick={onEdit}>
            Edit Content
          </Button>
          <button 
            onClick={onDelete}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-1.5">
          <Badge variant={badgeClass} className="text-[10px] font-bold tracking-wider uppercase">
            {resume.templateId}
          </Badge>
          <span className="text-[10px] font-medium text-slate-400 tabular-nums">
            {formatDate(resume.updatedAt)}
          </span>
        </div>
        <h3 className="font-bold text-slate-900 line-clamp-1 leading-tight group-hover:text-primary transition-colors">
          {resume.resumeTitle}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
          {resume.meta?.name || 'Incomplete Profile'}
        </p>
      </div>
    </motion.div>
  )
}
