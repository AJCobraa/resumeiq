/**
 * SectionEditor — renders editors for all resume sections (experience, education, skills, projects).
 * Supports adding/removing items, reordering (drag-free — just buttons), and inline editing.
 */
import { useCallback } from 'react'
import { v4 as uuid } from 'uuid'

/* ──────────────────────────────────────────────────────
   Shared utilities
   ────────────────────────────────────────────────────── */

function SectionHeader({ title, onAdd, addLabel }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{title}</h3>
      {onAdd && (
        <button onClick={onAdd} className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium cursor-pointer">
          + {addLabel || 'Add'}
        </button>
      )}
    </div>
  )
}

function FieldInput({ label, value, onChange, placeholder, multiline }) {
  const cls = "w-full px-3 py-2 bg-bg-elevated border border-border-default rounded-[6px] text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none transition-colors"
  return (
    <div>
      {label && <label className="text-xs font-medium text-text-muted mb-1 block">{label}</label>}
      {multiline ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls + ' resize-none'} />
      ) : (
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  )
}

function RemoveButton({ onClick }) {
  return (
    <button onClick={onClick} className="text-text-muted hover:text-red text-xs transition-colors cursor-pointer" title="Remove">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

/* ──────────────────────────────────────────────────────
   Experience Section Editor
   ────────────────────────────────────────────────────── */
function ExperienceEditor({ section, onUpdate, onRemoveSection }) {
  const updateField = (field, value) => {
    onUpdate({ ...section, [field]: value })
  }

  const addBullet = () => {
    onUpdate({
      ...section,
      bullets: [...(section.bullets || []), { bulletId: uuid(), text: '' }],
    })
  }

  const updateBullet = (idx, text) => {
    const bullets = [...section.bullets]
    bullets[idx] = { ...bullets[idx], text }
    onUpdate({ ...section, bullets })
  }

  const removeBullet = (idx) => {
    const bullets = section.bullets.filter((_, i) => i !== idx)
    onUpdate({ ...section, bullets })
  }

  return (
    <div className="p-4 bg-bg-elevated border border-border-default rounded-[8px] space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-accent-blue uppercase">Experience</span>
        <RemoveButton onClick={onRemoveSection} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Company" value={section.company} onChange={v => updateField('company', v)} placeholder="Google" />
        <FieldInput label="Role / Title" value={section.role} onChange={v => updateField('role', v)} placeholder="Software Engineer" />
        <FieldInput label="Location" value={section.location} onChange={v => updateField('location', v)} placeholder="Mountain View, CA" />
        <div className="flex gap-2">
          <FieldInput label="Start" value={section.startDate} onChange={v => updateField('startDate', v)} placeholder="Jan 2023" />
          <FieldInput label="End" value={section.endDate} onChange={v => updateField('endDate', v)} placeholder="Present" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-text-muted">Bullets</label>
          <button onClick={addBullet} className="text-xs text-accent-blue hover:text-accent-blue/80 cursor-pointer">+ Add Bullet</button>
        </div>
        {(section.bullets || []).map((b, i) => (
          <div key={b.bulletId} className="flex items-start gap-2 mb-2">
            <span className="text-text-muted text-xs mt-2.5">•</span>
            <textarea
              value={b.text}
              onChange={(e) => updateBullet(i, e.target.value)}
              placeholder="Describe an achievement or responsibility..."
              rows={2}
              className="flex-1 px-3 py-2 bg-bg-primary border border-border-default rounded-[6px] text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none resize-none"
            />
            <button onClick={() => removeBullet(i)} className="mt-2 text-text-muted hover:text-red cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Education Section Editor
   ────────────────────────────────────────────────────── */
function EducationEditor({ section, onUpdate, onRemoveSection }) {
  const updateItem = (idx, field, value) => {
    const items = [...section.items]
    items[idx] = { ...items[idx], [field]: value }
    onUpdate({ ...section, items })
  }

  const addItem = () => {
    onUpdate({
      ...section,
      items: [...(section.items || []), {
        eduId: uuid(), degree: '', institution: '', location: '', startYear: '', endYear: '', grade: '',
      }],
    })
  }

  const removeItem = (idx) => {
    onUpdate({ ...section, items: section.items.filter((_, i) => i !== idx) })
  }

  return (
    <div className="p-4 bg-bg-elevated border border-border-default rounded-[8px] space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-accent-green uppercase">Education</span>
        <RemoveButton onClick={onRemoveSection} />
      </div>
      {(section.items || []).map((item, i) => (
        <div key={item.eduId} className="space-y-2 pb-3 border-b border-border-default last:border-0 last:pb-0">
          <div className="flex justify-end"><RemoveButton onClick={() => removeItem(i)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Degree" value={item.degree} onChange={v => updateItem(i, 'degree', v)} placeholder="B.S. Computer Science" />
            <FieldInput label="Institution" value={item.institution} onChange={v => updateItem(i, 'institution', v)} placeholder="MIT" />
            <FieldInput label="Location" value={item.location} onChange={v => updateItem(i, 'location', v)} placeholder="Cambridge, MA" />
            <div className="flex gap-2">
              <FieldInput label="Start" value={item.startYear} onChange={v => updateItem(i, 'startYear', v)} placeholder="2018" />
              <FieldInput label="End" value={item.endYear} onChange={v => updateItem(i, 'endYear', v)} placeholder="2022" />
            </div>
            <FieldInput label="GPA / Grade" value={item.grade} onChange={v => updateItem(i, 'grade', v)} placeholder="3.9/4.0" />
          </div>
        </div>
      ))}
      <button onClick={addItem} className="text-xs text-accent-green hover:text-accent-green/80 font-medium cursor-pointer">+ Add Education</button>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Skills Section Editor
   ────────────────────────────────────────────────────── */
function SkillsEditor({ section, onUpdate, onRemoveSection }) {
  const updateCategory = (idx, field, value) => {
    const categories = [...section.categories]
    if (field === 'items') {
      categories[idx] = { ...categories[idx], items: value.split(',').map(s => s.trim()).filter(Boolean) }
    } else {
      categories[idx] = { ...categories[idx], [field]: value }
    }
    onUpdate({ ...section, categories })
  }

  const addCategory = () => {
    onUpdate({
      ...section,
      categories: [...(section.categories || []), { categoryId: uuid(), label: '', items: [] }],
    })
  }

  const removeCategory = (idx) => {
    onUpdate({ ...section, categories: section.categories.filter((_, i) => i !== idx) })
  }

  return (
    <div className="p-4 bg-bg-elevated border border-border-default rounded-[8px] space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-accent-purple uppercase">Skills</span>
        <RemoveButton onClick={onRemoveSection} />
      </div>
      {(section.categories || []).map((cat, i) => (
        <div key={cat.categoryId} className="flex items-start gap-3">
          <div className="flex-1 grid grid-cols-[120px_1fr] gap-2">
            <input
              type="text"
              value={cat.label}
              onChange={(e) => updateCategory(i, 'label', e.target.value)}
              placeholder="Category"
              className="px-2 py-1.5 bg-bg-primary border border-border-default rounded text-xs font-medium text-text-primary"
            />
            <input
              type="text"
              value={(cat.items || []).join(', ')}
              onChange={(e) => updateCategory(i, 'items', e.target.value)}
              placeholder="React, TypeScript, Node.js..."
              className="px-2 py-1.5 bg-bg-primary border border-border-default rounded text-xs text-text-primary"
            />
          </div>
          <RemoveButton onClick={() => removeCategory(i)} />
        </div>
      ))}
      <button onClick={addCategory} className="text-xs text-accent-purple hover:text-accent-purple/80 font-medium cursor-pointer">+ Add Category</button>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Projects Section Editor
   ────────────────────────────────────────────────────── */
function ProjectsEditor({ section, onUpdate, onRemoveSection }) {
  const updateItem = (idx, field, value) => {
    const items = [...section.items]
    items[idx] = { ...items[idx], [field]: value }
    onUpdate({ ...section, items })
  }

  const addItem = () => {
    onUpdate({
      ...section,
      items: [...(section.items || []), {
        projectId: uuid(), name: '', institution: '', startDate: '', endDate: '', techStack: '', description: '',
        bullets: [{ bulletId: uuid(), text: '' }],
      }],
    })
  }

  const removeItem = (idx) => {
    onUpdate({ ...section, items: section.items.filter((_, i) => i !== idx) })
  }

  const updateBullet = (itemIdx, bulletIdx, text) => {
    const items = [...section.items]
    const bullets = [...items[itemIdx].bullets]
    bullets[bulletIdx] = { ...bullets[bulletIdx], text }
    items[itemIdx] = { ...items[itemIdx], bullets }
    onUpdate({ ...section, items })
  }

  const addBullet = (itemIdx) => {
    const items = [...section.items]
    items[itemIdx] = {
      ...items[itemIdx],
      bullets: [...(items[itemIdx].bullets || []), { bulletId: uuid(), text: '' }],
    }
    onUpdate({ ...section, items })
  }

  const removeBullet = (itemIdx, bulletIdx) => {
    const items = [...section.items]
    items[itemIdx] = {
      ...items[itemIdx],
      bullets: items[itemIdx].bullets.filter((_, i) => i !== bulletIdx),
    }
    onUpdate({ ...section, items })
  }

  return (
    <div className="p-4 bg-bg-elevated border border-border-default rounded-[8px] space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-accent-orange uppercase">Projects</span>
        <RemoveButton onClick={onRemoveSection} />
      </div>
      {(section.items || []).map((item, i) => (
        <div key={item.projectId} className="space-y-2 pb-3 border-b border-border-default last:border-0 last:pb-0">
          <div className="flex justify-end"><RemoveButton onClick={() => removeItem(i)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Project Name" value={item.name} onChange={v => updateItem(i, 'name', v)} placeholder="ResumeIQ" />
            <FieldInput label="Organization" value={item.institution} onChange={v => updateItem(i, 'institution', v)} placeholder="Personal" />
            <FieldInput label="Tech Stack" value={item.techStack} onChange={v => updateItem(i, 'techStack', v)} placeholder="React, FastAPI, Firebase" />
            <div className="flex gap-2">
              <FieldInput label="Start" value={item.startDate} onChange={v => updateItem(i, 'startDate', v)} placeholder="Mar 2024" />
              <FieldInput label="End" value={item.endDate} onChange={v => updateItem(i, 'endDate', v)} placeholder="Present" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text-muted">Bullets</label>
              <button onClick={() => addBullet(i)} className="text-xs text-accent-orange hover:text-accent-orange/80 cursor-pointer">+ Bullet</button>
            </div>
            {(item.bullets || []).map((b, bi) => (
              <div key={b.bulletId} className="flex items-start gap-2 mb-2">
                <span className="text-text-muted text-xs mt-2.5">•</span>
                <textarea value={b.text} onChange={(e) => updateBullet(i, bi, e.target.value)} placeholder="Achievement..." rows={2}
                  className="flex-1 px-3 py-2 bg-bg-primary border border-border-default rounded-[6px] text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none resize-none" />
                <button onClick={() => removeBullet(i, bi)} className="mt-2 text-text-muted hover:text-red cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={addItem} className="text-xs text-accent-orange hover:text-accent-orange/80 font-medium cursor-pointer">+ Add Project</button>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Certifications Section Editor
   ────────────────────────────────────────────────────── */
function CertificationsEditor({ section, onUpdate, onRemoveSection }) {
  const updateItem = (idx, field, value) => {
    const items = [...section.items]
    items[idx] = { ...items[idx], [field]: value }
    onUpdate({ ...section, items })
  }

  const addItem = () => {
    onUpdate({
      ...section,
      items: [...(section.items || []), { certId: uuid(), name: '', issuer: '', year: '', description: '' }],
    })
  }

  const removeItem = (idx) => {
    onUpdate({ ...section, items: section.items.filter((_, i) => i !== idx) })
  }

  return (
    <div className="p-4 bg-bg-elevated border border-border-default rounded-[8px] space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-accent-blue uppercase">Certifications</span>
        <RemoveButton onClick={onRemoveSection} />
      </div>
      {(section.items || []).map((item, i) => (
        <div key={item.certId} className="space-y-2 pb-3 border-b border-border-default last:border-0 last:pb-0">
          <div className="flex justify-end"><RemoveButton onClick={() => removeItem(i)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Certification Name" value={item.name} onChange={v => updateItem(i, 'name', v)} placeholder="AWS Solutions Architect" />
            <FieldInput label="Issuing Organization" value={item.issuer} onChange={v => updateItem(i, 'issuer', v)} placeholder="Amazon Web Services" />
            <FieldInput label="Year" value={item.year} onChange={v => updateItem(i, 'year', v)} placeholder="2024" />
            <FieldInput label="Description" value={item.description} onChange={v => updateItem(i, 'description', v)} placeholder="Optional short description" />
          </div>
        </div>
      ))}
      <button onClick={addItem} className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium cursor-pointer">+ Add Certification</button>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Achievements Section Editor
   ────────────────────────────────────────────────────── */
function AchievementsEditor({ section, onUpdate, onRemoveSection }) {
  const addBullet = () => {
    onUpdate({
      ...section,
      bullets: [...(section.bullets || []), { bulletId: uuid(), text: '' }],
    })
  }

  const updateBullet = (idx, text) => {
    const bullets = [...section.bullets]
    bullets[idx] = { ...bullets[idx], text }
    onUpdate({ ...section, bullets })
  }

  const removeBullet = (idx) => {
    onUpdate({ ...section, bullets: section.bullets.filter((_, i) => i !== idx) })
  }

  return (
    <div className="p-4 bg-bg-elevated border border-border-default rounded-[8px] space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-accent-orange uppercase">Achievements</span>
        <RemoveButton onClick={onRemoveSection} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-text-muted">Highlights</label>
          <button onClick={addBullet} className="text-xs text-accent-orange hover:text-accent-orange/80 cursor-pointer">+ Add</button>
        </div>
        {(section.bullets || []).map((b, i) => (
          <div key={b.bulletId} className="flex items-start gap-2 mb-2">
            <span className="text-text-muted text-xs mt-2.5">•</span>
            <textarea
              value={b.text}
              onChange={(e) => updateBullet(i, e.target.value)}
              placeholder="Won 1st place at HackMIT 2024..."
              rows={2}
              className="flex-1 px-3 py-2 bg-bg-primary border border-border-default rounded-[6px] text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none resize-none"
            />
            <button onClick={() => removeBullet(i)} className="mt-2 text-text-muted hover:text-red cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Main Section Editor
   ────────────────────────────────────────────────────── */
export default function SectionEditor({ sections, onChange }) {
  const updateSection = useCallback((idx, updated) => {
    const newSections = [...sections]
    newSections[idx] = updated
    onChange(newSections)
  }, [sections, onChange])

  const removeSection = useCallback((idx) => {
    onChange(sections.filter((_, i) => i !== idx))
  }, [sections, onChange])

  const addSection = (type) => {
    const base = { sectionId: uuid(), order: sections.length }
    let newSection
    switch (type) {
      case 'experience':
        newSection = { ...base, type: 'experience', company: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [{ bulletId: uuid(), text: '' }] }
        break
      case 'education':
        newSection = { ...base, type: 'education', items: [{ eduId: uuid(), degree: '', institution: '', location: '', startYear: '', endYear: '', grade: '' }] }
        break
      case 'skills':
        newSection = { ...base, type: 'skills', categories: [{ categoryId: uuid(), label: '', items: [] }] }
        break
      case 'projects':
        newSection = { ...base, type: 'projects', items: [{ projectId: uuid(), name: '', institution: '', startDate: '', endDate: '', techStack: '', description: '', bullets: [{ bulletId: uuid(), text: '' }] }] }
        break
      case 'certifications':
        newSection = { ...base, type: 'certifications', items: [{ certId: uuid(), name: '', issuer: '', year: '', description: '' }] }
        break
      case 'achievements':
        newSection = { ...base, type: 'achievements', bullets: [{ bulletId: uuid(), text: '' }] }
        break
      default:
        return
    }
    onChange([...sections, newSection])
  }

  const renderSection = (section, idx) => {
    switch (section.type) {
      case 'experience':
        return <ExperienceEditor key={section.sectionId} section={section} onUpdate={(s) => updateSection(idx, s)} onRemoveSection={() => removeSection(idx)} />
      case 'education':
        return <EducationEditor key={section.sectionId} section={section} onUpdate={(s) => updateSection(idx, s)} onRemoveSection={() => removeSection(idx)} />
      case 'skills':
        return <SkillsEditor key={section.sectionId} section={section} onUpdate={(s) => updateSection(idx, s)} onRemoveSection={() => removeSection(idx)} />
      case 'projects':
        return <ProjectsEditor key={section.sectionId} section={section} onUpdate={(s) => updateSection(idx, s)} onRemoveSection={() => removeSection(idx)} />
      case 'certifications':
        return <CertificationsEditor key={section.sectionId} section={section} onUpdate={(s) => updateSection(idx, s)} onRemoveSection={() => removeSection(idx)} />
      case 'achievements':
        return <AchievementsEditor key={section.sectionId} section={section} onUpdate={(s) => updateSection(idx, s)} onRemoveSection={() => removeSection(idx)} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Resume Sections" />

      {sections.map((section, idx) => renderSection(section, idx))}

      {/* Add Section dropdown */}
      <div className="pt-3 border-t border-border-default">
        <p className="text-xs text-text-muted mb-2 font-medium">Add Section</p>
        <div className="flex flex-wrap gap-2">
          {[
                      { type: 'experience', label: '💼 Experience', color: 'accent-blue' },
            { type: 'education', label: '🎓 Education', color: 'accent-green' },
            { type: 'skills', label: '⚡ Skills', color: 'accent-purple' },
            { type: 'projects', label: '🚀 Projects', color: 'accent-orange' },
            { type: 'certifications', label: '🏅 Certifications', color: 'accent-blue' },
            { type: 'achievements', label: '🏆 Achievements', color: 'accent-orange' },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => addSection(type)}
              className="px-3 py-1.5 text-xs font-medium bg-bg-elevated border border-border-default rounded-[6px] hover:border-accent-blue hover:bg-accent-blue/5 transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
