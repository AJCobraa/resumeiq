/**
 * ExecutiveBlueTemplate — ATS-safe premium resume template.
 * Display-only React component — never modifies data.
 * Features a deep blue header, serif typography, and multi-column skills.
 * Inline styles only — no Tailwind (per AGENTS.md).
 */

const FONT = "'Georgia', 'Times New Roman', serif"
const COLOR = { 
  primary: '#0B3B5C', // The deep blue from the header
  text: '#333333', 
  secondary: '#555555', 
  white: '#FFFFFF',
  divider: '#0B3B5C' 
}

const baseStyle = {
  fontFamily: FONT,
  color: COLOR.text,
  fontSize: '10pt',
  lineHeight: '1.5',
  boxSizing: 'border-box',
  backgroundColor: COLOR.white,
  minHeight: '100%',
}

export default function ExecutiveBlueTemplate({ resume }) {
  if (!resume) return null

  const { meta = {}, sections = [] } = resume

  // Sort and group sections exactly like CobraTemplate to prevent duplicate headers
  const sorted = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
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
    <div style={baseStyle} id="executive-blue-template">
      {/* ── Header Section (Deep Blue) ────────────────────────────────── */}
      <div style={{ backgroundColor: COLOR.primary, color: COLOR.white, padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '12px' }}>
            {meta.name && (
              <span style={{ fontSize: '26pt', fontWeight: 700, letterSpacing: '0.5px', marginRight: '12px' }}>
                {meta.name}
              </span>
            )}
            {meta.title && (
              <span style={{ fontSize: '16pt', fontStyle: 'italic', fontWeight: 400, color: '#E0E7FF' }}>
                {meta.title}
              </span>
            )}
          </div>
          <ContactRow meta={meta} />
        </div>
        
        {/* Profile Picture Placeholder - Optional based on your DB schema */}
        {meta.photoUrl ? (
           <img 
             src={meta.photoUrl} 
             alt={meta.name} 
             style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', marginLeft: '20px' }} 
           />
        ) : (
           <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#1E4E70', border: '3px solid white', marginLeft: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <span style={{ fontSize: '24pt', color: 'white' }}>{meta.name ? meta.name.charAt(0) : ''}</span>
           </div>
        )}
      </div>

      {/* ── Body Section ───────────────────────────────── */}
      <div style={{ padding: '30px 48px' }}>
        
        {/* ── Summary ───────────────────────────────── */}
        {meta.summary && (
          <div style={{ marginBottom: '20px' }}>
            <SectionTitle text="Summary" />
            <p style={{ color: COLOR.text, margin: '8px 0 0', fontSize: '10pt', lineHeight: 1.6, textAlign: 'justify' }}>
              {meta.summary}
            </p>
          </div>
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
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Professional Experience" />
      <div style={{ marginTop: '12px' }}>
        {filled.map((section) => (
          <ExperienceEntry key={section.sectionId} section={section} />
        ))}
      </div>
    </div>
  )
}

function EducationGroup({ sections }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(i => i.degree || i.institution))
  if (allItems.length === 0) return null
  return (
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Education" />
      <div style={{ marginTop: '12px' }}>
        {allItems.map((item) => (
          <EducationEntry key={item.eduId} item={item} />
        ))}
      </div>
    </div>
  )
}

function SkillsGroup({ sections }) {
  const allCats = sections.flatMap(s => (s.categories || []).filter(c => c.label || (c.items || []).length > 0))
  if (allCats.length === 0) return null
  return (
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Skills" />
      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {allCats.map((cat) => (
          <div key={cat.categoryId}>
            {/* If you want the category label shown, uncomment this: */}
            {/* <span style={{ fontWeight: 700, display: 'block', marginBottom: '4px' }}>{cat.label}</span> */}
            <ul style={{ margin: 0, paddingLeft: '16px', listStyleType: 'disc' }}>
              {(cat.items || []).map((skill, idx) => (
                <li key={idx} style={{ fontSize: '10pt', color: COLOR.text, marginBottom: '4px' }}>{skill}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectsGroup({ sections }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(i => i.name))
  if (allItems.length === 0) return null
  return (
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Projects" />
      <div style={{ marginTop: '12px' }}>
        {allItems.map((item) => (
          <ProjectEntry key={item.projectId} item={item} />
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Individual Entry Components
   ────────────────────────────────────────────────────── */

function ExperienceEntry({ section }) {
  const dateStr = [section.startDate, section.endDate].filter(Boolean).join(' – ')
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 700, fontSize: '11pt', color: COLOR.text }}>{section.role}</span>
        <span style={{ fontSize: '10pt', color: COLOR.text }}>{dateStr}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        {section.company && <span style={{ fontStyle: 'italic', fontSize: '10pt', color: COLOR.secondary }}>{section.company}</span>}
        {section.location && <span style={{ fontSize: '10pt', color: COLOR.text }}>{section.location}</span>}
      </div>
      <BulletList bullets={section.bullets} />
    </div>
  )
}

function EducationEntry({ item }) {
  const dateStr = [item.startYear, item.endYear].filter(Boolean).join(' – ')
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 700, fontSize: '10.5pt', color: COLOR.text }}>{item.degree}</span>
        <span style={{ fontSize: '10pt', color: COLOR.text }}>{dateStr}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {item.institution && <span style={{ fontStyle: 'italic', fontSize: '10pt', color: COLOR.secondary }}>{item.institution}</span>}
        {item.location && <span style={{ fontSize: '10pt', color: COLOR.text }}>{item.location}</span>}
      </div>
      {item.grade && (
        <p style={{ fontSize: '10pt', color: COLOR.secondary, margin: '2px 0 0' }}>GPA: {item.grade}</p>
      )}
    </div>
  )
}

function ProjectEntry({ item }) {
  const dateStr = [item.startDate, item.endDate].filter(Boolean).join(' – ')
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '11pt', color: COLOR.text }}>{item.name}</span>
          {item.techStack && (
            <span style={{ fontStyle: 'italic', color: COLOR.secondary, fontSize: '10pt', marginLeft: 8 }}>
              | {item.techStack}
            </span>
          )}
        </div>
        <span style={{ fontSize: '10pt', color: COLOR.text }}>{dateStr}</span>
      </div>
      {item.institution && (
        <p style={{ fontSize: '10pt', fontStyle: 'italic', color: COLOR.secondary, margin: '0 0 4px 0' }}>{item.institution}</p>
      )}
      <BulletList bullets={item.bullets} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Shared sub-components
   ────────────────────────────────────────────────────── */

function ContactRow({ meta }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: '8px 24px', fontSize: '9.5pt', color: COLOR.white }}>
      {meta.email && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span dangerouslySetInnerHTML={{ __html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>' }} />
          <span>{meta.email}</span>
        </div>
      )}
      {meta.phone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
           <span dangerouslySetInnerHTML={{ __html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>' }} />
          <span>{meta.phone}</span>
        </div>
      )}
      {meta.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span dangerouslySetInnerHTML={{ __html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' }} />
          <span>{meta.location}</span>
        </div>
      )}
      {meta.linkedin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span dangerouslySetInnerHTML={{ __html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>' }} />
          <span>{meta.linkedin.replace(/^https?:\/\//, '')}</span>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ text }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <h2 style={{ 
        fontSize: '13pt', 
        fontWeight: 700, 
        margin: 0, 
        color: COLOR.primary,
        display: 'inline-block',
        borderBottom: `2px solid ${COLOR.primary}`,
        paddingBottom: '2px'
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
    <ul style={{ margin: '4px 0 0', paddingLeft: '18px', listStyleType: 'disc' }}>
      {filled.map((b) => (
        <li key={b.bulletId} style={{ fontSize: '10pt', color: COLOR.text, marginBottom: '4px', lineHeight: 1.5 }}>
          {b.text}
        </li>
      ))}
    </ul>
  )
}

export const templateMeta = {
  id: 'executive',
  name: 'Executive Blue',
  description: 'Professional & Bold Structure'
};
