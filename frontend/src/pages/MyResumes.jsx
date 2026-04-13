import { useState, useEffect, useCallback, memo, Suspense, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { formatDate, truncate } from '../lib/utils'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'
import { TEMPLATE_OPTIONS, TEMPLATE_REGISTRY } from '../lib/templateRegistry'

const ResumeThumbnail = memo(({ resume }) => {
  const templateId = resume?.templateId || 'cobra'
  const TemplateComponent = TEMPLATE_REGISTRY[templateId]?.component
  if (!TemplateComponent) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="text-[10px] text-slate-400">No Preview</span>
      </div>
    )
  }
  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none select-none"
        style={{ width: '800px', height: '1131px', transform: 'scale(var(--thumb-scale, 0.30))' }}
      >
        <Suspense fallback={null}>
          <TemplateComponent resume={resume} isThumbnail={true} />
        </Suspense>
      </div>
    </div>
  )
})

export default function MyResumes() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState(null)
  const [selectionSource, setSelectionSource] = useState(null) // 'create' or 'import'

  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getResumes()
      setResumes(data)
    } catch (err) {
      toast.error('Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResumes()
  }, [fetchResumes])

  const handleCreatePrompt = () => {
    if (!newTitle.trim()) return
    setSelectionSource('create')
    setShowCreate(false)
    setShowTemplateModal(true)
  }

  const handleCreateFinal = async (templateId) => {
    try {
      setCreating(true)
      const resume = await api.createResume({ 
        title: newTitle.trim(),
        templateId 
      })
      toast.success('Resume created!')
      setShowTemplateModal(false)
      setNewTitle('')
      setSelectionSource(null)
      navigate(`/resumes/${resume.resumeId}`)
    } catch (err) {
      toast.error('Failed to create resume')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.deleteResume(deleteTarget.resumeId)
      setResumes(prev => prev.filter(r => r.resumeId !== deleteTarget.resumeId))
      toast.success('Resume deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error('Failed to delete resume')
    } finally {
      setDeleting(false)
    }
  }

  const handleImportPDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('PDF must be under 5MB')
      return
    }
    setPendingImportFile(file)
    setSelectionSource('import')
    setShowTemplateModal(true)
  }

  const handleImportFinal = async (templateId) => {
    if (!pendingImportFile) return
    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', pendingImportFile)
      formData.append('templateId', templateId)
      const resume = await api.importPDF(formData)
      toast.success('Resume imported! Redirecting to editor...')
      setShowTemplateModal(false)
      setPendingImportFile(null)
      setSelectionSource(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      navigate(`/resumes/${resume.resumeId}`)
    } catch (err) {
      toast.error('PDF import failed. Make sure the PDF has selectable text.')
    } finally {
      setImporting(false)
    }
  }

  if (loading && resumes.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8 w-full"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Resumes</h1>
            <p className="text-slate-500 mt-1">Create and manage your resumes</p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleImportPDF}
            />
            <Button
              variant="outline"
              loading={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {!importing && (
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              {importing ? 'Parsing PDF...' : 'Import Resume'}
            </Button>
          </div>
        </div>

        {resumes.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-lg font-semibold mb-2">No resumes yet</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Create your first resume to start analyzing job descriptions
              and tracking your ATS scores.
            </p>
            <Button onClick={() => { setShowCreate(true); setNewTitle('') }}>
              Create Your First Resume
            </Button>
          </Card>
        ) : (
          <div className="gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))' }}>
            <button
              onClick={() => { setShowCreate(true); setNewTitle('') }}
              className="relative aspect-[1/1.414] border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-slate-500 font-medium">New Resume</span>
            </button>

            {resumes.map((r, i) => (
              <motion.div
                key={r.resumeId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className="relative aspect-[1/1.414] rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  ref={el => {
                    if (!el) return
                    const update = () => el.style.setProperty('--thumb-scale', (el.offsetWidth / 800).toFixed(3))
                    update()
                    el._ro?.disconnect()
                    el._ro = new ResizeObserver(update)
                    el._ro.observe(el)
                  }}
                  onClick={() => navigate(`/resumes/${r.resumeId}`)}
                >
                  <ResumeThumbnail resume={r} />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/resumes/${r.resumeId}`) }}>
                      Edit
                    </Button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}
                      className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900/70 to-transparent">
                    <p className="text-white text-xs font-semibold truncate">{r.resumeTitle}</p>
                    <p className="text-white/70 text-[10px] truncate">{r.meta?.name || 'No name set'}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Step 1 Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Resume" size="sm">
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Resume Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePrompt()}
              placeholder="e.g. Frontend Developer Resume"
              autoFocus
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreatePrompt} disabled={!newTitle.trim()}>
              Next: Choose Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template Selection Modal */}
      <Modal 
        isOpen={showTemplateModal} 
        onClose={() => {
          setShowTemplateModal(false)
          setSelectionSource(null)
          setPendingImportFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }} 
        title="Choose a Template" 
        size="md"
      >
        <div className="grid grid-cols-2 gap-6 py-4">
          {TEMPLATE_OPTIONS.map(template => (
            <div 
              key={template.id}
              onClick={() => selectionSource === 'create' ? handleCreateFinal(template.id) : handleImportFinal(template.id)}
              className="group cursor-pointer space-y-3"
            >
              <div className="aspect-[3/4] rounded-xl border-2 border-slate-200 group-hover:border-blue-500 bg-white overflow-hidden transition-all duration-200 shadow-sm group-hover:shadow-md relative">
                <img 
                  src={template.image} 
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300">
                    Select {template.name}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{template.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{template.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          {(creating || importing) && (
            <div className="flex items-center gap-3 text-sm text-blue-600 bg-blue-50 px-6 py-3 rounded-full border border-blue-100 shadow-sm animate-pulse">
              <Spinner size="sm" />
              <span className="font-medium">{creating ? 'Creating your resume...' : 'Parsing PDF & populating template...'}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Resume?" size="sm">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-500 leading-relaxed">
            Are you sure you want to delete <strong className="text-slate-900">{deleteTarget?.resumeTitle}</strong>?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
             <p className="text-[11px] text-amber-700 leading-relaxed italic">
               Note: Existing job analyses will be preserved, but will show as linked to a deleted resume.
             </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="outline" onClick={handleDelete} loading={deleting} className="flex-1 bg-rose-500 text-white border-rose-600 hover:bg-rose-600">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
