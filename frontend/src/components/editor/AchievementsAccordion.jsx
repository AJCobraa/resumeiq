import { AddEntryButton } from './AccordionSection'
import { genId } from '../../lib/sectionUtils'

export function AchievementsAccordion({ sections, allSections, onChange }) {
  const section = sections[0]

  const addNewSection = () => {
    const newSection = {
      sectionId: genId(), type: 'achievements', order: allSections.length,
      bullets: [{ bulletId: genId(), text: '' }],
    }
    onChange([...allSections, newSection])
  }

  if (!section) {
    return <AddEntryButton label="Add Achievements Section" onClick={addNewSection} />
  }

  const updateBullet = (bi, text) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== section.sectionId) return s
      const bullets = (s.bullets || []).map((b, i) => i === bi ? { ...b, text } : b)
      return { ...s, bullets }
    }))

  const addBullet = () =>
    onChange(allSections.map(s => {
      if (s.sectionId !== section.sectionId) return s
      return { ...s, bullets: [...(s.bullets || []), { bulletId: genId(), text: '' }] }
    }))

  const removeBullet = (bi) =>
    onChange(allSections.map(s => {
      if (s.sectionId !== section.sectionId) return s
      return { ...s, bullets: (s.bullets || []).filter((_, i) => i !== bi) }
    }))

  return (
    <div>
      {(section.bullets || []).map((b, bi) => (
        <div key={b.bulletId} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
          <span style={{ marginTop: 8, color: '#9ca3af', fontSize: 16, flexShrink: 0 }}>•</span>
          <textarea
            value={b.text}
            onChange={e => updateBullet(bi, e.target.value)}
            placeholder="Describe an achievement, award, or recognition…"
            rows={2}
            style={{
              flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb',
              borderRadius: 8, fontSize: 12, resize: 'vertical',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => removeBullet(bi)}
            style={{ marginTop: 6, padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', borderRadius: 4, display: 'flex', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <AddEntryButton label="Add Achievement" onClick={addBullet} />
    </div>
  )
}
