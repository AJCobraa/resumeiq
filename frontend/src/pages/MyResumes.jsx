import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { formatDate, truncate } from '../lib/utils'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'
import { TEMPLATE_OPTIONS } from '../lib/templateRegistry'

export default function MyResumes() {
  const navigate = useNavigate()
  const toast = useToast()
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
      className="flex-1 overflow-y-auto p-8 max-w-6xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Resumes</h1>
          <p className="text-text-muted mt-1">Create and manage your resumes</p>
        </div>
        <div className="flex gap-3">
          {/* Hidden file input — triggered by clicking the button */}
          <input
            type="file"
            id="pdf-import-input"
            accept=".pdf"
            className="hidden"
            onChange={handleImportPDF}
          />
          <Button
            variant="outline"
            loading={importing}
            onClick={() => document.getElementById('pdf-import-input').click()}
          >
            {!importing && (
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            {importing ? 'Parsing PDF...' : 'Import Resume'}
          </Button>
          <Button onClick={() => { setShowCreate(true); setNewTitle('') }}>
            + New Resume
          </Button>
        </div>
      </div>

      {/* Resume Grid or Empty State */}
      {resumes.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-lg font-semibold mb-2">No resumes yet</h2>
          <p className="text-text-muted text-sm max-w-md mx-auto mb-6">
            Create your first resume to start analyzing job descriptions
            and tracking your ATS scores.
          </p>
          <Button onClick={() => { setShowCreate(true); setNewTitle('') }}>
            Create Your First Resume
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resumes.map((r, i) => (
            <motion.div
              key={r.resumeId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              >
                <Card 
                  hover
                  className="cursor-pointer group relative h-full flex flex-col"
                  onClick={() => navigate(`/resumes/${r.resumeId}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue uppercase tracking-wide">
                      {r.templateId || 'cobra'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(r)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red transition-all duration-200 p-1 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold mb-1 group-hover:text-accent-blue transition-colors">
                    {r.resumeTitle || 'Untitled Resume'}
                  </h3>

                  {/* Name / role */}
                  <p className="text-sm text-text-muted mb-3">
                    {r.meta?.name && r.meta?.title
                      ? `${r.meta.name} • ${truncate(r.meta.title, 30)}`
                      : r.meta?.name || 'No name set'}
                  </p>

                  {/* Date */}
                  <p className="text-xs text-text-muted mt-auto pt-4">
                    Updated {formatDate(r.updatedAt)}
                  </p>
                </Card>
              </motion.div>
            ))}

          {/* "New" card */}
          <button
            onClick={() => { setShowCreate(true); setNewTitle('') }}
            className="border-2 border-dashed border-border-default rounded-[8px] p-5 hover:border-accent-blue hover:bg-accent-blue/5 transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer"
          >
            <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm text-text-muted font-medium">New Resume</span>
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Resume" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Resume Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Frontend Developer Resume"
              autoFocus
              className="w-full px-3 py-2 bg-bg-elevated border border-border-default rounded-[6px] text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreatePrompt} loading={creating} disabled={!newTitle.trim()}>
              Next: Choose Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template Selection Modal */}
      <Modal 
        isOpen={showTemplateModal} 
        onClose={() => setShowTemplateModal(false)} 
        title="Choose a Template" 
        size="md"
      >
        <div className="grid grid-cols-2 gap-6 py-2">
          {TEMPLATE_OPTIONS.map(template => (
            <div 
              key={template.id}
              onClick={() => selectionSource === 'create' ? handleCreateFinal(template.id) : handleImportFinal(template.id)}
              className="group cursor-pointer space-y-3"
            >
              <div className="aspect-[3/4] rounded-lg border-2 border-border-default group-hover:border-accent-blue bg-white overflow-hidden transition-all duration-200 shadow-sm group-hover:shadow-md relative">
                <img 
                  src={template.image} 
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-accent-blue/0 group-hover:bg-accent-blue/5 transition-colors" />
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-text-primary">{template.name}</h4>
                <p className="text-xs text-text-muted mt-1">{template.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          {(creating || importing) && (
            <div className="flex items-center gap-3 text-sm text-accent-blue animate-pulse">
              <Spinner size="sm" />
              <span>{creating ? 'Creating your resume...' : 'Parsing PDF & populating template...'}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Resume?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete <strong className="text-text-primary">{deleteTarget?.resumeTitle}</strong>?
            This will also delete all associated job analyses. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete Resume
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
