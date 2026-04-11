import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { debounce } from '../lib/utils'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'
import MetaEditor from '../components/editor/MetaEditor'
import SectionEditor from '../components/editor/SectionEditor'
import { TEMPLATE_REGISTRY } from '../lib/templateRegistry'

export default function ResumeEditor() {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('meta')
  const resumeRef = useRef(null)

  // Keep ref in sync for debounced save
  useEffect(() => { resumeRef.current = resume }, [resume])

  const fetchResume = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getResume(resumeId)
      setResume(data)
    } catch {
      toast.error('Failed to load resume')
      navigate('/resumes')
    } finally {
      setLoading(false)
    }
  }, [resumeId, navigate, toast])

  useEffect(() => { fetchResume() }, [fetchResume])

  // ── Auto-save debounced (500ms) ─────────────────────
  const debouncedSaveSections = useRef(
    debounce(async (id, sections) => {
      try {
        setSaving(true)
        await api.updateSections(id, { sections })
      } catch {
        // silent fail — user can retry
      } finally {
        setSaving(false)
      }
    }, 500)
  ).current

  const debouncedSaveMeta = useRef(
    debounce(async (id, updates) => {
      try {
        setSaving(true)
        await api.updateMeta(id, updates)
      } catch {
        // silent fail
      } finally {
        setSaving(false)
      }
    }, 500)
  ).current

  // ── Handlers ────────────────────────────────────────
  const handleMetaChange = useCallback((field, value) => {
    setResume(prev => {
      const updated = { ...prev, meta: { ...prev.meta, [field]: value } }
      debouncedSaveMeta(resumeId, { [field]: value })
      return updated
    })
  }, [resumeId, debouncedSaveMeta])

  const handleSectionsChange = useCallback((newSections) => {
    setResume(prev => {
      const updated = { ...prev, sections: newSections }
      debouncedSaveSections(resumeId, newSections)
      return updated
    })
  }, [resumeId, debouncedSaveSections])

  const handleTitleChange = useCallback(async (newTitle) => {
    setResume(prev => ({ ...prev, resumeTitle: newTitle }))
    try {
      await api.updateResumeTitle(resumeId, { title: newTitle })
    } catch {
      // silent
    }
  }, [resumeId])

  const handleExportPDF = useCallback(async () => {
    try {
      setExporting(true)
      await api.exportPDF(resumeId, resume?.templateId || 'cobra')
      toast.success('PDF downloaded!')
    } catch {
      toast.error('PDF export failed')
    } finally {
      setExporting(false)
    }
  }, [resumeId, resume?.templateId, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!resume) return null

  const tabs = [
    { id: 'meta', label: 'Personal Info' },
    { id: 'sections', label: 'Sections' },
  ]

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ═══ Left Panel — Editor ══════════════════════ */}
      <div className="w-[480px] min-w-[480px] border-r border-border-default flex flex-col bg-bg-primary overflow-hidden">
        {/* Editor Header */}
        <div className="px-5 py-4 border-b border-border-default flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/resumes')}
              className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="text"
              value={resume.resumeTitle || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none outline-none text-text-primary placeholder-text-muted w-full"
              placeholder="Resume Title"
            />
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-text-muted animate-pulse">Saving...</span>
            )}
            <Button size="sm" variant="outline" onClick={handleExportPDF} loading={exporting}>
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-default flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors cursor-pointer
                ${activeTab === tab.id
                  ? 'text-accent-blue border-b-2 border-accent-blue'
                  : 'text-text-muted hover:text-text-primary'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'meta' && (
            <MetaEditor meta={resume.meta} onChange={handleMetaChange} />
          )}
          {activeTab === 'sections' && (
            <SectionEditor
              sections={resume.sections}
              onChange={handleSectionsChange}
            />
          )}
        </div>
      </div>

      {/* ═══ Right Panel — Live Preview ══════════════ */}
      {/*
        BUG FIX (Section 20.2):
        - The right panel must be h-full + overflow-y-auto so it scrolls internally
          without breaking out of the viewport.
        - The A4 page is sized in pixels (794 × 1123) matching real A4 at 96dpi.
        - We add enough paddingBottom so the scaled page isn't clipped at the bottom.
        - transform-origin: top center so scale anchors to the top-left of the container.
      */}
      <div className="flex-1 h-full overflow-y-auto bg-bg-elevated" style={{ paddingBottom: '80px' }}>
        <div className="flex justify-center pt-8">
          <div
            style={{
              width: '794px',
              minHeight: '1123px',
              background: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              borderRadius: '2px',
              transformOrigin: 'top center',
            }}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Spinner size="md" />
                <span className="ml-3 text-sm text-text-muted">Loading template...</span>
              </div>
            }>
              {(() => {
                const SelectedTemplate = TEMPLATE_REGISTRY[resume.templateId]?.component || TEMPLATE_REGISTRY['cobra']?.component;
                return SelectedTemplate ? <SelectedTemplate resume={resume} /> : null;
              })()}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
