/**
 * CobraTemplate — ATS-safe resume template.
 * Display-only React component — never modifies data.
 * Uses only ATS-safe fonts: Arial, Helvetica, Georgia, Times New Roman.
 * Inline styles only — no Tailwind (per AGENTS.md).
 *
 * BUG FIX (Section 20.1): Group sections by type before rendering.
 * This ensures EXPERIENCE (and all other headers) only appears ONCE,
 * regardless of how many individual experience/project entries exist.
 */

const FONT = "'Arial', 'Helvetica', sans-serif"
const COLOR = { primary: '#1a1a1a', secondary: '#555555', accent: '#2563eb', divider: '#e5e5e5', light: '#777777' }

const baseStyle = {
  fontFamily: FONT,
  color: COLOR.primary,
  padding: '40px 48px',
  fontSize: '10pt',
  lineHeight: '1.4',
  boxSizing: 'border-box',
}

export default function CobraTemplate({ resume }) {
  if (!resume) return null

  const { meta = {}, sections = [] } = resume

  // Sort sections by order field
  const sorted = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  // Group consecutive sections of the same type together so we only emit
  // ONE section header per type, even when there are multiple entries.
  // e.g. [exp1, exp2, skills, proj1, proj2] → groups: [experience[], skills[], projects[]]
  const groups = []
  for (const section of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.type === section.type) {
      last.items.push(section)
    } else {
      groups.push({ type: section.type, items: [section] })
    }
  }

  return (
    <div style={baseStyle} id="cobra-template">
      {/* ── Header ────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {meta.name && (
          <h1 style={{ fontSize: '22pt', fontWeight: 700, margin: '0 0 4px', letterSpacing: '0.5px', color: COLOR.primary }}>
            {meta.name}
          </h1>
        )}
        {meta.title && (
          <p style={{ fontSize: '11pt', color: COLOR.secondary, margin: '0 0 8px' }}>
            {meta.title}
          </p>
        )}
        <ContactRow meta={meta} />
      </div>

      {/* ── Summary ───────────────────────────────── */}
      {meta.summary && (
        <>
          <SectionTitle text="Professional Summary" />
          <p style={{ color: COLOR.secondary, margin: '4px 0 12px', fontSize: '9.5pt', lineHeight: 1.5 }}>
            {meta.summary}
          </p>
        </>
      )}

      {/* ── Grouped Sections ──────────────────────── */}
      {groups.map((group, gi) => {
        switch (group.type) {
          case 'experience':
            return <ExperienceGroup key={`exp-${gi}`} sections={group.items} />
          case 'education':
            return <EducationGroup key={`edu-${gi}`} sections={group.items} />
          case 'skills':
            return <SkillsGroup key={`skills-${gi}`} sections={group.items} />
          case 'projects':
            return <ProjectsGroup key={`proj-${gi}`} sections={group.items} />
          default:
            return null
        }
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Grouped Section Components — header rendered ONCE
   ────────────────────────────────────────────────────── */

function ExperienceGroup({ sections }) {
  // Filter out empty sections before deciding to render header
  const filled = sections.filter(s => s.company || s.role || (s.bullets || []).some(b => b.text))
  if (filled.length === 0) return null
  return (
    <>
      <SectionTitle text="Experience" />
      {filled.map((section) => (
        <ExperienceEntry key={section.sectionId} section={section} />
      ))}
    </>
  )
}

function EducationGroup({ sections }) {
  // Education sections store their entries in .items[]
  const allItems = sections.flatMap(s => (s.items || []).filter(i => i.degree || i.institution))
  if (allItems.length === 0) return null
  return (
    <>
      <SectionTitle text="Education" />
      {allItems.map((item) => (
        <EducationEntry key={item.eduId} item={item} />
      ))}
    </>
  )
}

function SkillsGroup({ sections }) {
  const allCats = sections.flatMap(s => (s.categories || []).filter(c => c.label || (c.items || []).length > 0))
  if (allCats.length === 0) return null
  return (
    <>
      <SectionTitle text="Skills" />
      {allCats.map((cat) => (
        <p key={cat.categoryId} style={{ margin: '3px 0', fontSize: '9.5pt' }}>
          <span style={{ fontWeight: 700 }}>{cat.label}: </span>
          <span style={{ color: COLOR.secondary }}>{(cat.items || []).join(', ')}</span>
        </p>
      ))}
    </>
  )
}

function ProjectsGroup({ sections }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(i => i.name))
  if (allItems.length === 0) return null
  return (
    <>
      <SectionTitle text="Projects" />
      {allItems.map((item) => (
        <ProjectEntry key={item.projectId} item={item} />
      ))}
    </>
  )
}

/* ──────────────────────────────────────────────────────
   Individual Entry Components
   ────────────────────────────────────────────────────── */

function ExperienceEntry({ section }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{section.role}</span>
          {section.company && <span style={{ color: COLOR.secondary }}>{' — '}{section.company}</span>}
        </div>
        <span style={{ fontSize: '9pt', color: COLOR.light, whiteSpace: 'nowrap' }}>
          {[section.startDate, section.endDate].filter(Boolean).join(' – ')}
        </span>
      </div>
      {section.location && (
        <p style={{ fontSize: '9pt', color: COLOR.light, margin: '1px 0 0' }}>{section.location}</p>
      )}
      <BulletList bullets={section.bullets} />
    </div>
  )
}

function EducationEntry({ item }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{item.degree}</span>
          {item.institution && <span style={{ color: COLOR.secondary }}>{' — '}{item.institution}</span>}
        </div>
        <span style={{ fontSize: '9pt', color: COLOR.light, whiteSpace: 'nowrap' }}>
          {[item.startYear, item.endYear].filter(Boolean).join(' – ')}
        </span>
      </div>
      {item.location && (
        <p style={{ fontSize: '9pt', color: COLOR.light, margin: '1px 0 0' }}>{item.location}</p>
      )}
      {item.grade && (
        <p style={{ fontSize: '9pt', color: COLOR.secondary, margin: '1px 0 0' }}>GPA: {item.grade}</p>
      )}
    </div>
  )
}

function ProjectEntry({ item }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{item.name}</span>
          {item.techStack && (
            <span style={{ color: COLOR.accent, fontSize: '9pt', marginLeft: 8 }}>
              {'['}{item.techStack}{']'}
            </span>
          )}
        </div>
        <span style={{ fontSize: '9pt', color: COLOR.light, whiteSpace: 'nowrap' }}>
          {[item.startDate, item.endDate].filter(Boolean).join(' – ')}
        </span>
      </div>
      {item.institution && (
        <p style={{ fontSize: '9pt', color: COLOR.light, margin: '1px 0 0' }}>{item.institution}</p>
      )}
      <BulletList bullets={item.bullets} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Shared sub-components
   ────────────────────────────────────────────────────── */

function ContactRow({ meta }) {
  const items = [
    meta.email,
    meta.phone,
    meta.location,
    meta.linkedin && meta.linkedin.replace(/^https?:\/\//, ''),
    meta.github && meta.github.replace(/^https?:\/\//, ''),
  ].filter(Boolean)
  if (items.length === 0) return null
  return (
    <p style={{ fontSize: '9pt', color: COLOR.light, margin: 0 }}>
      {items.join('  •  ')}
    </p>
  )
}

function SectionTitle({ text }) {
  return (
    <div style={{ borderBottom: `1.5px solid ${COLOR.primary}`, paddingBottom: 2, marginBottom: 8, marginTop: 14 }}>
      <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: 0, color: COLOR.primary }}>
        {text}
      </h2>
    </div>
  )
}

function BulletList({ bullets }) {
  const filled = (bullets || []).filter(b => b.text)
  if (filled.length === 0) return null
  return (
    <ul style={{ margin: '4px 0 0', paddingLeft: 18, listStyleType: 'disc' }}>
      {filled.map((b) => (
        <li key={b.bulletId} style={{ fontSize: '9.5pt', color: COLOR.secondary, marginBottom: 2, lineHeight: 1.45 }}>
          {b.text}
        </li>
      ))}
    </ul>
  )
}

export const templateMeta = {
  id: 'cobra',
  name: 'Standard ATS (Cobra)',
  description: 'Modern & Clean ATS-Ready'
};
