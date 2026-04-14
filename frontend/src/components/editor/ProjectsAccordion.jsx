import { useState } from 'react'
import { EntryCard, FormField, AddEntryButton } from './AccordionSection'
import { moveSection, genId } from '../../lib/sectionUtils'

function BulletRow({ bullet, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
      <span style={{ marginTop: 8, color: '#9ca3af', fontSize: 16, flexShrink: 0 }}>•</span>
      <textarea
        value={bullet.text}
        onChange={e => onChange(e.target.value)}
        placeholder="Describe project detail or result…"
        rows={2}
        style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
      />
      <button
        onClick={onRemove}
        style={{ marginTop: 6, padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', borderRadius: 4, display: 'flex', flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}

export function ProjectsAccordion({ sections, allSections, onChange }) {
  const [openId, setOpenId] = useState(null)

  // Flatten all project items from all project sections
  const allItems = sections.flatMap(s =>
    (s.items || []).map(item => ({ ...item, _sectionId: s.sectionId }))
  )

  const updateItem = (sectionId, projectId, field, value) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const items = (s.items || []).map(item =>
        item.projectId === projectId ? { ...item, [field]: value } : item
      )
      return { ...s, items }
    }))

  const updateBullet = (sectionId, projectId, bi, text) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const items = (s.items || []).map(item => {
        if (item.projectId !== projectId) return item
        const bullets = (item.bullets || []).map((b, i) =>
          i === bi ? { ...b, text } : b
        )
        return { ...item, bullets }
      })
      return { ...s, items }
    }))

  const addBullet = (sectionId, projectId) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const items = (s.items || []).map(item => {
        if (item.projectId !== projectId) return item
        return {
          ...item,
          bullets: [...(item.bullets || []),
                    { bulletId: genId(), text: '' }]
        }
      })
      return { ...s, items }
    }))

  const removeBullet = (sectionId, projectId, bi) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const items = (s.items || []).map(item => {
        if (item.projectId !== projectId) return item
        return {
          ...item,
          bullets: (item.bullets || []).filter((_, i) => i !== bi)
        }
      })
      return { ...s, items }
    }))

  const addEntry = () => {
    const newItem = {
      projectId: genId(), name: '', techStack: '',
      startDate: '', endDate: '', institution: '',
      description: '',
      bullets: [{ bulletId: genId(), text: '' }],
    }
    const existingSection = sections[0]
    if (existingSection) {
      onChange(allSections.map(s =>
        s.sectionId === existingSection.sectionId
          ? { ...s, items: [...(s.items || []), newItem] }
          : s
      ))
    } else {
      const newSection = {
        sectionId: genId(), type: 'projects',
        order: Math.max(0, ...allSections.map(s => s.order || 0)) + 1,
        items: [newItem],
      }
      onChange([...allSections, newSection])
    }
    setOpenId(newItem.projectId)
  }

  const removeItem = (sectionId, projectId) => {
    const updated = allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      return {
        ...s,
        items: (s.items || []).filter(i => i.projectId !== projectId)
      }
    })
    // Remove the section entirely if it has no items left
    onChange(updated.filter(
      s => s.type !== 'projects' || (s.items && s.items.length > 0)
    ))
  }

  const moveItem = (sectionId, projectId, dir) => {
    // Reorder within the section's items array
    const updated = allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const items = [...(s.items || [])]
      const idx = items.findIndex(i => i.projectId === projectId)
      if (dir === 'up' && idx === 0) return s
      if (dir === 'down' && idx === items.length - 1) return s
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1
      ;[items[idx], items[swapIdx]] = [items[swapIdx], items[idx]]
      return { ...s, items }
    })
    onChange(updated)
  }

  return (
    <div>
      {allItems.map((item, idx) => {
        // Count items in the same section for move up/down bounds
        const sectionItems = sections
          .find(s => s.sectionId === item._sectionId)?.items || []
        const itemIdx = sectionItems.findIndex(
          i => i.projectId === item.projectId
        )
        return (
          <EntryCard
            key={item.projectId}
            title={item.name || 'New Project'}
            subtitle={item.techStack}
            isOpen={openId === item.projectId}
            onToggle={() =>
              setOpenId(openId === item.projectId ? null : item.projectId)
            }
            onRemove={() => removeItem(item._sectionId, item.projectId)}
            onMoveUp={() => moveItem(item._sectionId, item.projectId, 'up')}
            onMoveDown={() =>
              moveItem(item._sectionId, item.projectId, 'down')
            }
            showMoveUp={itemIdx > 0}
            showMoveDown={itemIdx < sectionItems.length - 1}
          >
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '0 10px'
            }}>
              <FormField label="Project Name" value={item.name}
                onChange={v =>
                  updateItem(item._sectionId, item.projectId, 'name', v)
                }
                placeholder="ResumeIQ" />
              <FormField label="Tech Stack" value={item.techStack}
                onChange={v =>
                  updateItem(item._sectionId, item.projectId, 'techStack', v)
                }
                placeholder="React, FastAPI, Firestore" />
              <FormField label="Start Date" value={item.startDate}
                onChange={v =>
                  updateItem(item._sectionId, item.projectId, 'startDate', v)
                }
                placeholder="Mar 2024" />
              <FormField label="End Date" value={item.endDate}
                onChange={v =>
                  updateItem(item._sectionId, item.projectId, 'endDate', v)
                }
                placeholder="Present" />
            </div>
            <FormField label="Description" value={item.description}
              onChange={v =>
                updateItem(item._sectionId, item.projectId, 'description', v)
              }
              placeholder="One-line project summary…" />

            {/* Bullets */}
            <div style={{ marginTop: 4 }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 6
              }}>
                <label style={{
                  fontSize: 11, fontWeight: 500, color: '#6b7280',
                  textTransform: 'uppercase', letterSpacing: '0.03em'
                }}>
                  Bullets
                </label>
                <button
                  onClick={() =>
                    addBullet(item._sectionId, item.projectId)
                  }
                  style={{
                    fontSize: 11, color: '#7c3aed', background: 'none',
                    border: 'none', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  + Add Bullet
                </button>
              </div>
              {(item.bullets || []).map((b, bi) => (
                <BulletRow
                  key={b.bulletId}
                  bullet={b}
                  onChange={text =>
                    updateBullet(item._sectionId, item.projectId, bi, text)
                  }
                  onRemove={() =>
                    removeBullet(item._sectionId, item.projectId, bi)
                  }
                />
              ))}
            </div>
          </EntryCard>
        )
      })}
      <AddEntryButton label="Add Project" onClick={addEntry} />
    </div>
  )
}
