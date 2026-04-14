import { useState } from 'react'
import { EntryCard, FormField, AddEntryButton } from './AccordionSection'
import { genId } from '../../lib/sectionUtils'

export function CertificationsAccordion({ sections, allSections, onChange }) {
  const [openId, setOpenId] = useState(null)

  /* Flatten all items from all certification sections */
  const allItems = sections.flatMap(s => (s.items || []).map(item => ({ ...item, _sectionId: s.sectionId })))

  const updateItem = (sectionId, certId, field, value) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const items = (s.items || []).map(item => item.certId === certId ? { ...item, [field]: value } : item)
      return { ...s, items }
    }))

  const addEntry = () => {
    const newItem = { certId: genId(), name: '', issuer: '', year: '', link: '', description: '' }
    const existingSection = sections[0]
    if (existingSection) {
      onChange(allSections.map(s =>
        s.sectionId === existingSection.sectionId
          ? { ...s, items: [...(s.items || []), newItem] }
          : s
      ))
    } else {
      const newSection = {
        sectionId: genId(), type: 'certifications', order: allSections.length,
        items: [newItem],
      }
      onChange([...allSections, newSection])
    }
    setOpenId(newItem.certId)
  }

  const removeItem = (sectionId, certId) => {
    const updated = allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      return { ...s, items: (s.items || []).filter(i => i.certId !== certId) }
    })
    onChange(updated.filter(s => s.type !== 'certifications' || (s.items && s.items.length > 0)))
  }

  return (
    <div>
      {allItems.map((item) => (
        <EntryCard
          key={item.certId}
          title={item.name || 'New Certification'}
          subtitle={item.issuer}
          isOpen={openId === item.certId}
          onToggle={() => setOpenId(openId === item.certId ? null : item.certId)}
          onRemove={() => removeItem(item._sectionId, item.certId)}
          showMoveUp={false}
          showMoveDown={false}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
            <FormField
              label="Certification Name"
              value={item.name}
              onChange={v => updateItem(item._sectionId, item.certId, 'name', v)}
              placeholder="AWS Solutions Architect"
            />
            <FormField
              label="Issuer"
              value={item.issuer}
              onChange={v => updateItem(item._sectionId, item.certId, 'issuer', v)}
              placeholder="Amazon Web Services"
            />
            <FormField
              label="Year / Date"
              value={item.year}
              onChange={v => updateItem(item._sectionId, item.certId, 'year', v)}
              placeholder="2024"
            />
            <FormField
              label="Certificate Link"
              value={item.link}
              onChange={v => updateItem(item._sectionId, item.certId, 'link', v)}
              placeholder="https://www.credly.com/badges/..."
            />
          </div>
          <FormField label="Description (optional)" value={item.description} onChange={v => updateItem(item._sectionId, item.certId, 'description', v)} placeholder="Brief note about this certification…" multiline rows={2} />
        </EntryCard>
      ))}
      <AddEntryButton label="Add Certification" onClick={addEntry} />
    </div>
  )
}
