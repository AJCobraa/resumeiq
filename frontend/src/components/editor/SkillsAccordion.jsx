import { AddEntryButton } from './AccordionSection'
import { genId } from '../../lib/sectionUtils'

export function SkillsAccordion({ sections, allSections, onChange }) {
  const section = sections[0]

  const addNewSection = () => {
    const newSection = {
      sectionId: genId(), type: 'skills', order: allSections.length,
      categories: [{ categoryId: genId(), label: '', items: [] }],
    }
    onChange([...allSections, newSection])
  }

  if (!section) {
    return <AddEntryButton label="Add Skills Section" onClick={addNewSection} />
  }

  const updateCategory = (catIdx, field, value) => {
    const categories = (section.categories || []).map((c, i) => {
      if (i !== catIdx) return c
      if (field === 'items') return { ...c, items: value.split(',').map(s => s.trim()).filter(Boolean) }
      return { ...c, [field]: value }
    })
    onChange(allSections.map(s => s.sectionId === section.sectionId ? { ...s, categories } : s))
  }

  const addCategory = () => {
    const categories = [...(section.categories || []), { categoryId: genId(), label: '', items: [] }]
    onChange(allSections.map(s => s.sectionId === section.sectionId ? { ...s, categories } : s))
  }

  const removeCategory = (catIdx) => {
    const categories = (section.categories || []).filter((_, i) => i !== catIdx)
    onChange(allSections.map(s => s.sectionId === section.sectionId ? { ...s, categories } : s))
  }

  return (
    <div>
      {(section.categories || []).map((cat, i) => (
        <div key={cat.categoryId} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <input
            value={cat.label}
            onChange={e => updateCategory(i, 'label', e.target.value)}
            placeholder="Category (e.g. Languages)"
            style={{
              width: 130, flexShrink: 0, padding: '7px 10px',
              border: '1px solid #e5e7eb', borderRadius: 8,
              fontSize: 12, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <input
            value={(cat.items || []).join(', ')}
            onChange={e => updateCategory(i, 'items', e.target.value)}
            placeholder="React, TypeScript, Node.js…"
            style={{
              flex: 1, padding: '7px 10px',
              border: '1px solid #e5e7eb', borderRadius: 8,
              fontSize: 12, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => removeCategory(i)}
            style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', marginTop: 2 }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <AddEntryButton label="Add Category" onClick={addCategory} />
    </div>
  )
}
