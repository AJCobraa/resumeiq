/**
 * ModernCleanTemplate — Light & Typography-First ATS-safe resume template.
 * Display-only React component — never modifies data.
 * Inline styles ONLY — no Tailwind (per AGENTS.md).
 * ATS-safe font: Arial, Helvetica, sans-serif.
 * No profile photo — not supported.
 */

function stripScheme(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '')
}

function ensureHttp(url) {
  if (!url) return '#'
  return url.startsWith('http') ? url : `https://${url}`
}

const FONT = "'Arial', 'Helvetica', sans-serif"
const C = {
  primary: '#1a1a1a',
  secondary: '#555555',
  muted: '#777777',
  accent: '#2563eb',
  pill_bg: '#eff6ff',
  pill_text: '#2563eb',
}

/* ──────────────────────────────────────────────────────
   Main template component
   ────────────────────────────────────────────────────── */
export default function ModernCleanTemplate({ resume }) {
  if (!resume) return null

  const meta = resume?.meta || {}
  const sections = resume?.sections || []

  const sorted = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  // Group consecutive sections of same type
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
    <div style={{
      fontFamily: FONT,
      color: C.primary,
      fontSize: '10pt',
      lineHeight: 1.5,
      padding: '40px 48px',
      background: '#ffffff',
    }} id="modern-clean-template">

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {meta.name && (
          <h1 style={{
            fontSize: '22pt', fontWeight: 700, margin: '0 0 4px',
            letterSpacing: '0.5px', color: C.primary,
          }}>
            {meta.name}
          </h1>
        )}
        {meta.title && (
          <p style={{ fontSize: '11pt', color: C.secondary, margin: '0 0 8px' }}>
            {meta.title}
          </p>
        )}
        <ContactRow meta={meta} />
      </div>

      {/* ── Summary ── */}
      {meta.summary && (
        <>
          <SectionTitle text="Professional Summary" />
          <p style={{ color: C.secondary, margin: '4px 0 12px', fontSize: '9.5pt', lineHeight: 1.5 }}>
            {meta.summary}
          </p>
        </>
      )}

      {/* ── Grouped Sections ── */}
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
          case 'certifications':
            return <CertificationsGroup key={`cert-${gi}`} sections={group.items} />
          case 'achievements':
            return <AchievementsGroup key={`achv-${gi}`} sections={group.items} />
          default:
            return null
        }
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Grouped Section Components
   ────────────────────────────────────────────────────── */

function ExperienceGroup({ sections }) {
  const filled = sections.filter(s => s.company || s.role || (s.bullets || []).some(b => b.text))
  if (filled.length === 0) return null
  return (
    <>
      <SectionTitle text="Experience" />
      {filled.map(section => (
        <ExperienceEntry key={section.sectionId} section={section} />
      ))}
    </>
  )
}

function EducationGroup({ sections }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(i => i.degree || i.institution))
  if (allItems.length === 0) return null
  return (
    <>
      <SectionTitle text="Education" />
      {allItems.map(item => (
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
      {allCats.map(cat => (
        <div key={cat.categoryId} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, minWidth: 80, fontSize: '9.5pt' }}>{cat.label}:</span>
          <div>
            {(cat.items || []).map((skill, idx) => (
              <span key={idx} style={{
                background: C.pill_bg, color: C.pill_text,
                borderRadius: 4, padding: '1px 6px', fontSize: '9pt',
                marginRight: 4, display: 'inline-block',
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
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
      {allItems.map(item => (
        <ProjectEntry key={item.projectId} item={item} />
      ))}
    </>
  )
}

function CertificationsGroup({ sections }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(c => c.name))
  if (allItems.length === 0) return null
  return (
    <>
      <SectionTitle text="Certifications" />
      {allItems.map((item, idx) => (
        <div key={item.certId || idx} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{item.name}</span>
              {item.issuer && (
                <span style={{ color: C.secondary, fontSize: '10pt' }}> — {item.issuer}</span>
              )}
            </div>
            {item.year && (
              <span style={{ fontSize: '9pt', color: C.muted, whiteSpace: 'nowrap' }}>{item.year}</span>
            )}
          </div>
        </div>
      ))}
    </>
  )
}

function AchievementsGroup({ sections }) {
  const allBullets = sections.flatMap(s => (s.bullets || []).filter(b => b.text))
  if (allBullets.length === 0) return null
  return (
    <>
      <SectionTitle text="Achievements" />
      <BulletList bullets={allBullets} />
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
          <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{section.company}</span>
          {section.role && (
            <span style={{ color: C.secondary, fontSize: '10pt' }}> — {section.role}</span>
          )}
        </div>
        <span style={{ fontSize: '9pt', color: C.muted, whiteSpace: 'nowrap' }}>
          {[section.startDate, section.endDate].filter(Boolean).join(' – ')}
        </span>
      </div>
      {section.location && (
        <p style={{ fontSize: '9pt', color: C.muted, margin: '1px 0 0' }}>{section.location}</p>
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
          <span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{item.institution}</span>
          {item.degree && (
            <span style={{ fontStyle: 'italic', color: C.secondary, fontSize: '10pt' }}> — {item.degree}</span>
          )}
          {item.grade && (
            <span style={{ color: C.muted, fontSize: '9pt' }}> ({item.grade})</span>
          )}
        </div>
        <span style={{ fontSize: '9pt', color: C.muted, whiteSpace: 'nowrap' }}>
          {[item.startYear, item.endYear].filter(Boolean).join(' – ')}
        </span>
      </div>
      {item.location && (
        <p style={{ fontSize: '9pt', color: C.muted, margin: '1px 0 0' }}>{item.location}</p>
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
            <span style={{ color: C.muted, fontSize: '9pt', marginLeft: 6 }}>{item.techStack}</span>
          )}
        </div>
        <span style={{ fontSize: '9pt', color: C.muted, whiteSpace: 'nowrap' }}>
          {[item.startDate, item.endDate].filter(Boolean).join(' – ')}
        </span>
      </div>
      {item.institution && (
        <p style={{ fontSize: '9pt', color: C.muted, margin: '1px 0 0' }}>{item.institution}</p>
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
    meta.email && { href: `mailto:${meta.email}`, text: meta.email },
    meta.phone && { href: `tel:${meta.phone}`, text: meta.phone },
    meta.location && { href: null, text: meta.location },
    meta.linkedin && { href: ensureHttp(meta.linkedin), text: stripScheme(meta.linkedin), external: true },
    meta.github && { href: ensureHttp(meta.github), text: stripScheme(meta.github), external: true },
    meta.blog && { href: ensureHttp(meta.blog), text: stripScheme(meta.blog), external: true },
    meta.leetcode && { href: ensureHttp(meta.leetcode), text: stripScheme(meta.leetcode), external: true },
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <p style={{ fontSize: '9pt', color: C.muted, margin: 0 }}>
      {items.map((item, idx) => (
        <span key={idx}>
          {idx > 0 && <span style={{ margin: '0 4px' }}>•</span>}
          {item.href ? (
            <a
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseOver={e => { e.target.style.textDecoration = 'underline' }}
              onMouseOut={e => { e.target.style.textDecoration = 'none' }}
            >
              {item.text}
            </a>
          ) : (
            <span>{item.text}</span>
          )}
        </span>
      ))}
    </p>
  )
}

function SectionTitle({ text }) {
  return (
    <div style={{
      borderBottom: '1.5px solid #1a1a1a', paddingBottom: 2,
      marginTop: 14, marginBottom: 8,
    }}>
      <h2 style={{
        fontSize: '10pt', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1px', margin: 0, color: C.primary,
      }}>
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
      {filled.map(b => (
        <li key={b.bulletId} style={{ fontSize: '9.5pt', color: C.secondary, marginBottom: 2, lineHeight: 1.45 }}>
          {b.text}
        </li>
      ))}
    </ul>
  )
}

export const templateMeta = {
  id: 'modern-clean',
  name: 'Modern Clean',
  description: 'Light & Typography-First',
}
