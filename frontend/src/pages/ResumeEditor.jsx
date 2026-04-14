import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { TEMPLATE_REGISTRY, TEMPLATE_OPTIONS } from '../lib/templateRegistry'
import { AccordionSection } from '../components/editor/AccordionSection'
import { FormField } from '../components/editor/AccordionSection'
import { ExperienceAccordion } from '../components/editor/ExperienceAccordion'
import { EducationAccordion } from '../components/editor/EducationAccordion'
import { ProjectsAccordion } from '../components/editor/ProjectsAccordion'
import { SkillsAccordion } from '../components/editor/SkillsAccordion'
import { CertificationsAccordion } from '../components/editor/CertificationsAccordion'
import { AchievementsAccordion } from '../components/editor/AchievementsAccordion'

/* ─── Inline SVG Icons ───────────────────────────────────────────── */
const UserIcon = () => <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const BriefcaseIcon = () => <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
const GraduationIcon = () => <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
const FolderIcon = () => <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
const ZapIcon = () => <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
const AwardIcon = () => <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
const StarIcon = () => <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
const SaveIcon = () => <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const DownloadIcon = () => <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const DocIcon = () => <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>

/* ─── Loading Screen ─────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <span style={{ fontSize: 14, color: '#6b7280' }}>Loading resume…</span>
      </div>
    </div>
  )
}

/* ─── Personal Info Editor ───────────────────────────────────────── */
function PersonalInfoEditor({ meta, onChange }) {
  const fields = [
    { key: 'name', label: 'Full Name', placeholder: 'Alex Johnson', cols: 2 },
    { key: 'title', label: 'Professional Title', placeholder: 'Senior Frontend Engineer', cols: 2 },
    { key: 'email', label: 'Email', placeholder: 'alex@example.com', cols: 1 },
    { key: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567', cols: 1 },
    { key: 'location', label: 'Location', placeholder: 'San Francisco, CA', cols: 2 },
  ]
  const linkFields = [
    { key: 'linkedin', label: '🔗 LinkedIn', placeholder: 'linkedin.com/in/johndoe' },
    { key: 'github', label: '🔗 GitHub', placeholder: 'github.com/johndoe' },
    { key: 'blog', label: '🔗 Portfolio', placeholder: 'johndoe.dev' },
    { key: 'leetcode', label: '🔗 LeetCode', placeholder: 'leetcode.com/johndoe' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
        {fields.map(f => (
          <div key={f.key} style={{ gridColumn: f.cols === 2 ? 'span 2' : 'span 1' }}>
            <FormField label={f.label} value={meta[f.key]} onChange={v => onChange(f.key, v)} placeholder={f.placeholder} />
          </div>
        ))}
      </div>
      <FormField label="Professional Summary" value={meta.summary} onChange={v => onChange('summary', v)}
        placeholder="3-4 sentence career summary…" multiline rows={3} />
      <div style={{ marginTop: 8, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Links & Profiles</div>
        {linkFields.map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', width: 80, flexShrink: 0 }}>{f.label}</span>
            <input type="text" value={meta[f.key] || ''} onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Customize Tab ──────────────────────────────────────────────── */
function CustomizeTab({ resume, onTemplateChange }) {
  return (
    <div style={{ padding: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Choose Template</div>
      {TEMPLATE_OPTIONS.map(tpl => {
        const isActive = tpl.id === resume.templateId
        return (
          <button key={tpl.id} onClick={() => onTemplateChange(tpl.id)} style={{
            width: '100%', padding: '12px 14px', marginBottom: 8,
            border: isActive ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
            borderRadius: 10, background: isActive ? '#faf5ff' : '#ffffff',
            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#7c3aed' : '#111827' }}>{tpl.name}</div>
              {tpl.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{tpl.description}</div>}
            </div>
            {isActive && <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#ede9fe', borderRadius: 999, padding: '3px 10px' }}>Active</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ─── AI Tools Tab ───────────────────────────────────────────────── */
function AiToolsTab() {
  const tools = [
    { icon: '🎯', title: 'ATS Optimizer', desc: 'Analyze this resume against a job description to see your match score.' },
    { icon: '✨', title: 'Bullet Rewriter', desc: 'Select any bullet point and rewrite it with AI to be more impactful.' },
    { icon: '📊', title: 'Score Check', desc: 'Get an instant ATS compatibility score for your current resume.' },
    { icon: '💡', title: 'Content Suggestions', desc: 'Get AI suggestions for missing skills and experience gaps.' },
  ]
  return (
    <div style={{ padding: 4 }}>
      {tools.map((t, i) => (
        <div key={i} style={{ padding: '14px', border: '1.5px solid #e5e7eb', borderRadius: 10, marginBottom: 8, background: '#ffffff', opacity: 0.72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.title}</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#9ca3af', background: '#f3f4f6', borderRadius: 999, padding: '2px 8px' }}>Soon</span>
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{t.desc}</p>
        </div>
      ))}
    </div>
  )
}

const A4_HEIGHT_PX = 1122  // 297mm at 96dpi

function PageBreakGuides() {
  // Render dashed lines at every A4 page boundary
  // These are purely visual — they do not affect PDF output
  const guides = [1, 2, 3, 4, 5]  // support up to 6 pages
  return (
    <>
      {guides.map(n => (
        <div
          key={n}
          style={{
            position: 'absolute',
            top: A4_HEIGHT_PX * n,
            left: 0,
            right: 0,
            height: 1,
            background: 'repeating-linear-gradient(to right, #94a3b8 0, #94a3b8 6px, transparent 6px, transparent 12px)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function ResumeEditor() {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('content')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  /* ── Load ─────────────────────────────────────────── */
  const fetchResume = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getResume(resumeId)
      setResume(data)
    } catch {
      toastRef.current.error('Failed to load resume')
      navigate('/resumes')
    } finally {
      setLoading(false)
    }
  }, [resumeId, navigate])

  useEffect(() => { fetchResume() }, [fetchResume])

  /* ── Navigation blocker ───────────────────────────── */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  )

  /* ── Ctrl+S ───────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    if (!resume || saving) return
    try {
      setSaving(true)
      await api.saveResume(resumeId, {
        meta: resume.meta,
        sections: resume.sections,
        title: resume.resumeTitle,
      })
      setHasUnsavedChanges(false)
      toast.success('Resume saved!')
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [resume, resumeId, saving, toast])

  useEffect(() => {
    const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  useEffect(() => {
    const onUnload = e => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [hasUnsavedChanges])

  /* ── Handlers ─────────────────────────────────────── */
  const handleMetaChange = useCallback((field, value) => {
    setResume(prev => ({ ...prev, meta: { ...prev.meta, [field]: value } }))
    setHasUnsavedChanges(true)
  }, [])

  const handleSectionsChange = useCallback((newSections) => {
    setResume(prev => ({ ...prev, sections: newSections }))
    setHasUnsavedChanges(true)
  }, [])

  const handleTemplateChange = useCallback(async (templateId) => {
    if (!resume || resume.templateId === templateId) return
    setResume(prev => ({ ...prev, templateId }))
    try {
      await api.updateTemplate(resumeId, { templateId })
      toast.success('Template updated!')
    } catch {
      toast.error('Failed to update template')
    }
  }, [resume, resumeId, toast])

  const handleExportPDF = useCallback(async () => {
    try {
      setExporting(true)
      await api.exportPDF(resumeId, resume?.templateId || 'cobra')
      toast.success('PDF downloaded!')
    } catch (err) {
      toast.error(err?.message || 'PDF export failed')
    } finally {
      setExporting(false)
    }
  }, [resumeId, resume?.templateId, toast])

  /* ── Render guards ────────────────────────────────── */
  if (loading) return <LoadingScreen />
  if (!resume) return null

  /* ── Section groups ───────────────────────────────── */
  const experienceSections = resume.sections.filter(s => s.type === 'experience')
  const educationSections  = resume.sections.filter(s => s.type === 'education')
  const projectSections    = resume.sections.filter(s => s.type === 'projects')
  const skillsSections     = resume.sections.filter(s => s.type === 'skills')
  const certSections       = resume.sections.filter(s => s.type === 'certifications')
  const achievementSections = resume.sections.filter(s => s.type === 'achievements')

  /* ── Live-preview template ────────────────────────── */
  const SelectedTemplate = TEMPLATE_REGISTRY[resume.templateId]?.component || TEMPLATE_REGISTRY['cobra']?.component

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>

      {/* ═══ HEADER ═══════════════════════════════════════════════ */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: '1px solid #e5e7eb',
        background: '#ffffff', flexShrink: 0, zIndex: 10,
      }}>
        {/* Left: back + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/resumes')}
            title="Back to resumes"
            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <DocIcon />
            <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>ResumeIQ</span>
          </div>
          {resume.resumeTitle && (
            <span style={{ fontSize: 13, color: '#9ca3af', paddingLeft: 4, borderLeft: '1.5px solid #e5e7eb', marginLeft: 4 }}>
              {resume.resumeTitle}
            </span>
          )}
        </div>

        {/* Center: tab pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f3f4f6', borderRadius: 999, padding: '4px' }}>
          {['content', 'customize', 'ai'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 20px', borderRadius: 999, border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                transition: 'all 0.15s',
                background: activeTab === tab ? '#7c3aed' : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#6b7280',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(124,58,237,0.3)' : 'none',
              }}
            >
              {tab === 'content' ? 'Content' : tab === 'customize' ? 'Customize' : 'AI Tools'}
            </button>
          ))}
        </div>

        {/* Right: save button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 999, border: 'none',
              cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 600,
              background: hasUnsavedChanges ? '#7c3aed' : '#e5e7eb',
              color: hasUnsavedChanges ? '#ffffff' : '#9ca3af',
              transition: 'all 0.2s',
            }}
          >
            <SaveIcon />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {hasUnsavedChanges && !saving && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 12, height: 12, borderRadius: '50%',
              background: '#f97316', border: '2px solid #ffffff',
            }} />
          )}
        </div>
      </header>

      {/* ═══ BODY ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel — editor */}
        <div style={{
          width: '42%', minWidth: 400, maxWidth: 620,
          overflowY: 'auto', background: '#f8f9fa',
          padding: '16px 16px 60px',
          borderRight: '1px solid #e5e7eb',
          flexShrink: 0,
        }}>
          {activeTab === 'content' && (
            <>
              <AccordionSection icon={<UserIcon />} iconColor="#7c3aed" title="Personal Information">
                <PersonalInfoEditor meta={resume.meta} onChange={handleMetaChange} />
              </AccordionSection>

              <AccordionSection icon={<BriefcaseIcon />} iconColor="#3b82f6" title="Professional Experience"
                defaultOpen count={experienceSections.length}>
                <ExperienceAccordion sections={experienceSections} allSections={resume.sections} onChange={handleSectionsChange} />
              </AccordionSection>

              <AccordionSection icon={<GraduationIcon />} iconColor="#10b981" title="Education"
                count={educationSections.flatMap(s => s.items || []).length}>
                <EducationAccordion sections={educationSections} allSections={resume.sections} onChange={handleSectionsChange} />
              </AccordionSection>

              <AccordionSection icon={<FolderIcon />} iconColor="#f97316" title="Projects"
                count={projectSections.flatMap(s => s.items || []).length}>
                <ProjectsAccordion sections={projectSections} allSections={resume.sections} onChange={handleSectionsChange} />
              </AccordionSection>

              <AccordionSection icon={<ZapIcon />} iconColor="#f59e0b" title="Skills">
                <SkillsAccordion sections={skillsSections} allSections={resume.sections} onChange={handleSectionsChange} />
              </AccordionSection>

              <AccordionSection icon={<AwardIcon />} iconColor="#6366f1" title="Certifications"
                count={certSections.flatMap(s => s.items || []).length}>
                <CertificationsAccordion sections={certSections} allSections={resume.sections} onChange={handleSectionsChange} />
              </AccordionSection>

              <AccordionSection icon={<StarIcon />} iconColor="#f43f5e" title="Achievements">
                <AchievementsAccordion sections={achievementSections} allSections={resume.sections} onChange={handleSectionsChange} />
              </AccordionSection>
            </>
          )}
          {activeTab === 'customize' && (
            <CustomizeTab resume={resume} onTemplateChange={handleTemplateChange} />
          )}
          {activeTab === 'ai' && <AiToolsTab />}
        </div>

        {/* Right panel — live preview */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#e8e8e8', position: 'relative' }}>
          {/* Download button */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0', pointerEvents: 'none' }}>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              style={{
                pointerEvents: 'all',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 999,
                border: '1px solid #e5e7eb', background: '#ffffff',
                fontSize: 13, fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => !exporting && (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.16)')}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.1)'}
            >
              <DownloadIcon />
              {exporting ? 'Exporting…' : 'Download PDF'}
            </button>
          </div>

          {/* A4 paper */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '24px 24px 80px',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
          }}>
            {/* Page container — no fixed height, grows naturally */}
            <div style={{
              width: 794,
              background: '#ffffff',
              boxShadow: '0 4px 40px rgba(0,0,0,0.18)',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
            }}>
              <Suspense fallback={
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', height: 400,
                  color: '#9ca3af', fontSize: 14,
                }}>
                  Loading template…
                </div>
              }>
                {SelectedTemplate ? <SelectedTemplate resume={resume} /> : null}
              </Suspense>

              {/* A4 page-break guide lines overlay */}
              <PageBreakGuides />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ UNSAVED BLOCKER MODAL ═════════════════════════════════ */}
      {blocker.state === 'blocked' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 28, maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111827' }}>Unsaved Changes</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => blocker.reset()}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#ffffff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
              >
                Stay
              </button>
              <button
                onClick={() => blocker.proceed()}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
