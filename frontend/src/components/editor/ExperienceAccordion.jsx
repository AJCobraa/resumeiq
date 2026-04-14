import { useState } from 'react'
import { EntryCard, FormField, AddEntryButton } from './AccordionSection'
import { moveSection, genId } from '../../lib/sectionUtils'

/* Bullet sub-row inside an experience entry */
function BulletRow({ bullet, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
      <span style={{ marginTop: 8, color: '#9ca3af', fontSize: 16, flexShrink: 0 }}>•</span>
      <textarea
        value={bullet.text}
        onChange={e => onChange(e.target.value)}
        placeholder="Describe achievement or responsibility…"
        rows={2}
        style={{
          flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb',
          borderRadius: 8, fontSize: 12, resize: 'vertical',
          fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        }}
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

export function ExperienceAccordion({ sections, allSections, onChange }) {
  const [openId, setOpenId] = useState(null)

  const update = (sectionId, field, value) =>
    onChange(allSections.map(s => s.sectionId === sectionId ? { ...s, [field]: value } : s))

  const updateBullet = (sectionId, bi, text) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      const bullets = (s.bullets || []).map((b, i) => i === bi ? { ...b, text } : b)
      return { ...s, bullets }
    }))

  const addBullet = (sectionId) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      return { ...s, bullets: [...(s.bullets || []), { bulletId: genId(), text: '' }] }
    }))

  const removeBullet = (sectionId, bi) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== sectionId) return s
      return { ...s, bullets: (s.bullets || []).filter((_, i) => i !== bi) }
    }))

  const addEntry = () => {
    const newSec = {
      sectionId: genId(), type: 'experience', order: allSections.length,
      company: '', role: '', location: '', startDate: '', endDate: '', current: false,
      bullets: [{ bulletId: genId(), text: '' }],
    }
    onChange([...allSections, newSec])
    setOpenId(newSec.sectionId)
  }

  const removeEntry = (sectionId) => onChange(allSections.filter(s => s.sectionId !== sectionId))
  const moveEntry = (sectionId, dir) => onChange(moveSection(allSections, sectionId, dir))

  return (
    <div>
      {sections.map((sec, idx) => (
        <EntryCard
          key={sec.sectionId}
          title={sec.company || 'New Company'}
          subtitle={sec.role}
          isOpen={openId === sec.sectionId}
          onToggle={() => setOpenId(openId === sec.sectionId ? null : sec.sectionId)}
          onRemove={() => removeEntry(sec.sectionId)}
          onMoveUp={() => moveEntry(sec.sectionId, 'up')}
          onMoveDown={() => moveEntry(sec.sectionId, 'down')}
          showMoveUp={idx > 0}
          showMoveDown={idx < sections.length - 1}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
            <FormField label="Company" value={sec.company} onChange={v => update(sec.sectionId, 'company', v)} placeholder="Google" />
            <FormField label="Role / Title" value={sec.role} onChange={v => update(sec.sectionId, 'role', v)} placeholder="Software Engineer" />
            <FormField label="Start Date" value={sec.startDate} onChange={v => update(sec.sectionId, 'startDate', v)} placeholder="Jan 2022" />
            <FormField label="End Date" value={sec.endDate} onChange={v => update(sec.sectionId, 'endDate', v)} placeholder="Present" />
          </div>
          <FormField label="Location" value={sec.location} onChange={v => update(sec.sectionId, 'location', v)} placeholder="San Francisco, CA" />

          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Bullets</label>
              <button onClick={() => addBullet(sec.sectionId)} style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                + Add Bullet
              </button>
            </div>
            {(sec.bullets || []).map((b, bi) => (
              <BulletRow
                key={b.bulletId}
                bullet={b}
                onChange={text => updateBullet(sec.sectionId, bi, text)}
                onRemove={() => removeBullet(sec.sectionId, bi)}
              />
            ))}
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Experience" onClick={addEntry} />
    </div>
  )
}
