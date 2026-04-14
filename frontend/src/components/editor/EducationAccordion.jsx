import { useState } from 'react'
import { EntryCard, FormField, AddEntryButton } from './AccordionSection'
import { genId } from '../../lib/sectionUtils'

export function EducationAccordion({ sections, allSections, onChange }) {
  const [openId, setOpenId] = useState(null)

  /* Flatten all items from all education sections with back-ref */
  const allItems = sections.flatMap(s => (s.items || []).map(item => ({ ...item, _sectionId: s.sectionId })))

  const updateItem = (sectionId, itemId, field, value) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const items = (s.items || []).map(item => item.eduId === itemId ? { ...item, [field]: value } : item)
      return { ...s, items }
    }))

  const addEntry = () => {
    const newItem = { eduId: genId(), degree: '', institution: '', location: '', startYear: '', endYear: '', grade: '' }
    const existingSection = sections[0]
    if (existingSection) {
      onChange(allSections.map(s =>
        s.sectionId === existingSection.sectionId
          ? { ...s, items: [...(s.items || []), newItem] }
          : s
      ))
    } else {
      const newSection = {
        sectionId: genId(), type: 'education', order: allSections.length,
        items: [newItem],
      }
      onChange([...allSections, newSection])
    }
    setOpenId(newItem.eduId)
  }

  const removeItem = (sectionId, itemId) => {
    const updated = allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      return { ...s, items: (s.items || []).filter(i => i.eduId !== itemId) }
    })
    // Drop empty education sections
    onChange(updated.filter(s => s.type !== 'education' || (s.items && s.items.length > 0)))
  }

  return (
    <div>
      {allItems.map((item) => (
        <EntryCard
          key={item.eduId}
          title={item.institution || 'New Institution'}
          subtitle={[item.degree, item.field ? `in ${item.field}` : ''].filter(Boolean).join(' ')}
          isOpen={openId === item.eduId}
          onToggle={() => setOpenId(openId === item.eduId ? null : item.eduId)}
          onRemove={() => removeItem(item._sectionId, item.eduId)}
          showMoveUp={false}
          showMoveDown={false}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
            <FormField label="Degree" value={item.degree} onChange={v => updateItem(item._sectionId, item.eduId, 'degree', v)} placeholder="B.S. Computer Science" />
            <FormField label="Institution" value={item.institution} onChange={v => updateItem(item._sectionId, item.eduId, 'institution', v)} placeholder="MIT" />
            <FormField label="Start Year" value={item.startYear} onChange={v => updateItem(item._sectionId, item.eduId, 'startYear', v)} placeholder="2019" />
            <FormField label="End Year" value={item.endYear} onChange={v => updateItem(item._sectionId, item.eduId, 'endYear', v)} placeholder="2023" />
            <FormField label="Grade / GPA" value={item.grade} onChange={v => updateItem(item._sectionId, item.eduId, 'grade', v)} placeholder="3.8 GPA" />
            <FormField label="Location" value={item.location} onChange={v => updateItem(item._sectionId, item.eduId, 'location', v)} placeholder="Cambridge, MA" />
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Education" onClick={addEntry} />
    </div>
  )
}
