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
const COLOR = {
  primary: '#1a1a1a',
  secondary: '#555555',
  muted: '#777777',
  accent: '#2563eb',
  pill_bg: '#eff6ff',
  border: '#e5e7eb',
  text: '#1a1a1a',
}

const baseStyle = {
  fontFamily: "'Arial', 'Helvetica', sans-serif",
  color: COLOR.primary,
  fontSize: '1em',
  lineHeight: 1.5,
  background: '#ffffff',
  boxSizing: 'border-box'
}

/* ──────────────────────────────────────────────────────
   Main template component
   ────────────────────────────────────────────────────── */
export default function ModernCleanTemplate({ resume, customization, highlightIds = [] }) {
  if (!resume) return null

  const { meta = {}, sections = [] } = resume
  const c = customization;

  const dynamicBaseStyle = {
    ...baseStyle,
    fontFamily: `'${c?.font?.family ?? 'Arial'}', sans-serif`,
    fontSize: `${((c?.spacing?.fontSize ?? 10) * 1.333).toFixed(1)}px`,
    lineHeight: c?.spacing?.lineHeight ?? 1.4,
    padding: [
      `${((c?.spacing?.marginTopBottom ?? 10) * 3.7795).toFixed(1)}px`,
      `${((c?.spacing?.marginLeftRight ?? 10) * 3.7795).toFixed(1)}px`
    ].join(' '),
    '--accent-color': c?.colors?.accent ?? COLOR.primary,
    '--entry-gap': ['4px','8px','14px','22px'][c?.spacing?.spaceBetweenEntries ?? 1],
  }

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
    <div style={dynamicBaseStyle} id="modern-clean-template">
      {/* ── Header ────────────────────────────────── */}
      <div style={{ textAlign: c?.header?.textAlign || 'left', marginBottom: '24px', borderBottom: `3px solid ${COLOR.border}`, paddingBottom: '16px' }}>
        {meta.name && (
          <h1 style={{ 
            fontFamily: c?.name?.fontType === 'creative' && c?.name?.creativeFont ? `"${c.name.creativeFont}", cursive` : undefined,
            fontSize: c?.name?.size === 'XL' ? '3em' : c?.name?.size === 'L' ? '2.6em' : c?.name?.size === 'S' ? '1.8em' : c?.name?.size === 'XS' ? '1.6em' : '2.2em', 
            fontWeight: c?.name?.bold !== false ? 700 : 400, 
            margin: '0 0 8px', 
            color: c?.colors?.applyTo?.name ? 'var(--accent-color)' : COLOR.text,
            display: c?.title?.position === 'below' ? 'block' : 'inline',
            marginRight: c?.title?.position !== 'below' ? '12px' : '0'
          }}>
            {meta.name}
          </h1>
        )}
        {meta.title && (
          <p style={{ 
            fontSize: c?.title?.size === 'L' ? '1.6em' : c?.title?.size === 'S' ? '1.2em' : '1.4em', 
            color: c?.colors?.applyTo?.jobTitle ? 'var(--accent-color)' : COLOR.primary, 
            margin: '0 0 12px', 
            fontWeight: 500,
            fontStyle: c?.title?.style === 'italic' ? 'italic' : 'normal',
            display: c?.title?.position !== 'below' ? 'inline' : 'block'
          }}>
            {meta.title}
          </p>
        )}
        <ContactRow meta={meta} c={c} />
      </div>

      {/* ── Summary ───────────────────────────────── */}
      {meta.summary && (
        <div style={{ marginBottom: '24px' }}>
          {c?.summary?.showHeading !== false && <SectionTitle text="Profile" c={c} />}
          <p id="resume-node-summary" className={highlightIds.includes('summary') ? 'highlight-persistent' : ''} style={{ color: COLOR.secondary, margin: '8px 0 0', fontSize: '1em', lineHeight: 1.6 }}>
            {meta.summary}
          </p>
        </div>
      )}

      {/* ── Grouped Sections ──────────────────────── */}
      {groups.map((group, gi) => {
        switch (group.type) {
          case 'experience':
            return <ExperienceGroup key={`exp-${gi}`} sections={group.items} c={c} highlightIds={highlightIds} />
          case 'education':
            return <EducationGroup key={`edu-${gi}`} sections={group.items} c={c} />
          case 'skills':
            return <SkillsGroup key={`skills-${gi}`} sections={group.items} c={c} highlightIds={highlightIds} />
          case 'projects':
            return <ProjectsGroup key={`proj-${gi}`} sections={group.items} c={c} highlightIds={highlightIds} />
          case 'certifications':
            return <CertificationsGroup key={`cert-${gi}`} sections={group.items} c={c} />
          case 'achievements':
            return <AchievementsGroup key={`achv-${gi}`} sections={group.items} c={c} highlightIds={highlightIds} />
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

function ExperienceGroup({ sections, c, highlightIds = [] }) {
  const filled = sections.filter(s => s.company || s.role || (s.bullets || []).some(b => b.text))
  if (filled.length === 0) return null
  return (
    <div style={{ marginBottom: '24px' }}>
      <SectionTitle text="Experience" c={c} />
      <div style={{ marginTop: '16px' }}>
        {filled.map((section) => (
          <ExperienceEntry key={section.sectionId} section={section} c={c} highlightIds={highlightIds} />
        ))}
      </div>
    </div>
  )
}

function EducationGroup({ sections, c }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(i => i.degree || i.institution))
  if (allItems.length === 0) return null
  return (
    <div style={{ marginBottom: '24px' }}>
      <SectionTitle text="Education" c={c} />
      <div style={{ marginTop: '16px' }}>
        {allItems.map((item) => (
          <EducationEntry key={item.eduId} item={item} c={c} />
        ))}
      </div>
    </div>
  )
}

function SkillsGroup({ sections, c, highlightIds = [] }) {
  const allCats = sections.flatMap(s => (s.categories || []).filter(cat => cat.label || (cat.items || []).length > 0))
  if (allCats.length === 0) return null
  return (
    <div style={{ marginBottom: '24px' }}>
      <SectionTitle text="Skills & Expertise" c={c} />
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: c?.skills?.layout === 'grid' || c?.skills?.layout === 'bubble' ? 'row' : 'column', flexWrap: 'wrap', gap: c?.skills?.layout === 'grid' || c?.skills?.layout === 'bubble' ? '12px' : (c?.skills?.rowSpacing === 'tight' ? '4px' : '8px') }}>
        {allCats.map(cat => {
          if (c?.skills?.layout === 'bubble') {
            return (
              <div key={cat.categoryId} id={`resume-node-${cat.categoryId}`} className={highlightIds.includes(cat.categoryId) ? 'highlight-persistent' : ''} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(cat.items || []).map((skill, idx) => (
                  <span key={idx} style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 16, padding: '4px 10px', fontSize: '0.9em', border: '1px solid #bfdbfe' }}>
                    {skill}
                  </span>
                ))}
              </div>
            );
          }
          if (c?.skills?.layout === 'grid') {
            return (
              <div key={cat.categoryId} id={`resume-node-${cat.categoryId}`} className={highlightIds.includes(cat.categoryId) ? 'highlight-persistent' : ''} style={{ flex: '1 1 45%', minWidth: '200px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95em', marginBottom: 4 }}>{cat.label}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.9em', color: COLOR.secondary }}>
                  {(cat.items || []).map((skill, idx) => <li key={idx} style={{ marginBottom: 2 }}>{skill}</li>)}
                </ul>
              </div>
            );
          }
          const joiner = c?.skills?.subinfoStyle === 'dash' ? ' – ' : c?.skills?.subinfoStyle === 'bracket' ? ' ' : ': ';
          return (
            <div key={cat.categoryId} id={`resume-node-${cat.categoryId}`} className={highlightIds.includes(cat.categoryId) ? 'highlight-persistent' : ''} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {c?.skills?.startWithBullets && <span style={{ color: COLOR.secondary }}>•</span>}
              <span style={{ fontWeight: 700, minWidth: c?.skills?.layout === 'compact' ? 'auto' : 80, fontSize: '0.95em' }}>
                {cat.label}{c?.skills?.subinfoStyle === 'bracket' ? '' : joiner}
              </span>
              <div style={{ fontSize: '0.95em', color: COLOR.secondary }}>
                {c?.skills?.subinfoStyle === 'bracket' ? `(${(cat.items || []).join(', ')})` : (cat.items || []).join(', ')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}

function ProjectsGroup({ sections, c, highlightIds = [] }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(i => i.name))
  if (allItems.length === 0) return null
  return (
    <div style={{ marginBottom: '24px' }}>
      <SectionTitle text="Selected Projects" c={c} />
      <div style={{ marginTop: '16px' }}>
        {allItems.map((item) => (
          <ProjectEntry key={item.projectId} item={item} c={c} highlightIds={highlightIds} />
        ))}
      </div>
    </div>
  )
}

function CertificationsGroup({ sections, c }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(cert => cert.name))
  if (allItems.length === 0) return null
  return (
    <div style={{ marginBottom: '24px' }}>
      <SectionTitle text="Certifications" c={c} />
      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {allItems.map((item, idx) => (
          <div key={item.certId || idx} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1.05em' }}>{item.name}</span>
                {item.issuer && (
                  <span style={{ color: COLOR.secondary, fontSize: '1em' }}> — {item.issuer}</span>
                )}
              </div>
              {item.year && (
                <span style={{ fontSize: '0.9em', color: COLOR.muted, whiteSpace: 'nowrap' }}>{item.year}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AchievementsGroup({ sections, c, highlightIds = [] }) {
  const allBullets = sections.flatMap(s => (s.bullets || []).filter(b => b.text))
  if (allBullets.length === 0) return null
  return (
    <div style={{ marginBottom: '24px' }}>
      <SectionTitle text="Key Achievements" c={c} />
      <div style={{ marginTop: '8px' }}>
        <BulletList bullets={allBullets} c={c} highlightIds={highlightIds} />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Individual Entry Components
   ────────────────────────────────────────────────────── */

function ExperienceEntry({ section, c, highlightIds = [] }) {
  return (
    <div style={{ marginBottom: 'var(--entry-gap)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '1.1em', color: COLOR.text }}>{section.company}</span>
          {section.role && (
            <span style={{ color: c?.colors?.applyTo?.entrySubtitle ? 'var(--accent-color)' : COLOR.secondary, fontSize: '1em', fontStyle: c?.entry?.subtitleStyle === 'italic' ? 'italic' : 'normal' }}> — {section.role}</span>
          )}
        </div>
        <span style={{ fontSize: '0.9em', color: c?.colors?.applyTo?.dates ? 'var(--accent-color)' : COLOR.muted, whiteSpace: 'nowrap' }}>
          {[section.startDate, section.endDate].filter(Boolean).join(' – ')}
        </span>
      </div>
      {section.location && (
        <p style={{ fontSize: '0.9em', color: COLOR.muted, margin: '1px 0 4px' }}>{section.location}</p>
      )}
      <BulletList bullets={section.bullets} c={c} highlightIds={highlightIds} />
    </div>
  )
}

function EducationEntry({ item, c }) {
  return (
    <div style={{ marginBottom: 'var(--entry-gap)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '1.05em', color: COLOR.text }}>{item.institution}</span>
          {item.degree && (
            <span style={{ color: c?.colors?.applyTo?.entrySubtitle ? 'var(--accent-color)' : COLOR.secondary, fontSize: '1em', fontStyle: c?.entry?.subtitleStyle === 'italic' ? 'italic' : 'normal' }}> — {item.degree}</span>
          )}
          {item.grade && (
            <span style={{ color: COLOR.muted, fontSize: '0.9em' }}> ({item.grade})</span>
          )}
        </div>
        <span style={{ fontSize: '0.9em', color: c?.colors?.applyTo?.dates ? 'var(--accent-color)' : COLOR.muted, whiteSpace: 'nowrap' }}>
          {[item.startYear, item.endYear].filter(Boolean).join(' – ')}
        </span>
      </div>
      {item.location && (
        <p style={{ fontSize: '0.9em', color: COLOR.muted, margin: '1px 0 0' }}>{item.location}</p>
      )}
    </div>
  )
}

function ProjectEntry({ item, c, highlightIds = [] }) {
  return (
    <div style={{ marginBottom: 'var(--entry-gap)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: '1.05em' }}>{item.name}</span>
          {item.techStack && (
            <span style={{ color: COLOR.muted, fontSize: '0.9em' }}>{item.techStack}</span>
          )}
        </div>
        <span style={{ fontSize: '0.9em', color: c?.colors?.applyTo?.dates ? 'var(--accent-color)' : COLOR.muted, whiteSpace: 'nowrap' }}>
          {[item.startDate, item.endDate].filter(Boolean).join(' – ')}
        </span>
      </div>
      {item.institution && (
        <p style={{ fontSize: '0.95em', color: c?.colors?.applyTo?.entrySubtitle ? 'var(--accent-color)' : COLOR.secondary, margin: '0 0 8px 0', fontStyle: c?.entry?.subtitleStyle === 'italic' ? 'italic' : 'normal' }}>{item.institution}</p>
      )}
      <BulletList bullets={item.bullets} c={c} highlightIds={highlightIds} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Shared sub-components
   ────────────────────────────────────────────────────── */

function ContactRow({ meta, c }) {
  const items = [
    meta.email && { id: 'email', href: `mailto:${meta.email}`, text: meta.email },
    meta.phone && { id: 'phone', href: `tel:${meta.phone}`, text: meta.phone },
    meta.location && { id: 'location', href: null, text: meta.location },
    meta.linkedin && { id: 'linkedin', href: ensureHttp(meta.linkedin), text: stripScheme(meta.linkedin), external: true },
    meta.github && { id: 'github', href: ensureHttp(meta.github), text: stripScheme(meta.github), external: true },
    meta.blog && { id: 'website', href: ensureHttp(meta.blog), text: stripScheme(meta.blog), external: true },
    meta.leetcode && { id: 'leetcode', href: ensureHttp(meta.leetcode), text: stripScheme(meta.leetcode), external: true },
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <p style={{ fontSize: '0.9em', color: COLOR.muted, margin: 0 }}>
      {items.map((item, idx) => {
        const isAdvanced = c?.links?.advancedSettings?.[item.id];
        const isLink = !!item.href;
        const color = (isLink && (c?.links?.blueColor || isAdvanced)) ? '#2563eb' : 'inherit';
        const underline = (isLink && (c?.links?.underline || isAdvanced)) ? 'underline' : 'none';
        const iconColor = c?.colors?.applyTo?.headerIcons ? 'var(--accent-color)' : 'currentColor';
        const iconStyle = { width: 11, height: 11, marginRight: 4, color: iconColor, display: 'inline-block', verticalAlign: '-1px' };
        
        let icon = null;
        if (c?.links?.showIcon) {
          if (item.id === 'email') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
          else if (item.id === 'phone') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
          else if (item.id === 'location') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
          else icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
        }

        return (
          <span key={idx}>
            {idx > 0 && <span style={{ margin: '0 6px', color: c?.colors?.applyTo?.dots ? 'var(--accent-color)' : 'inherit' }}>•</span>}
            {item.href ? (
              <a
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                style={{ color, textDecoration: underline, display: 'inline-flex', alignItems: 'center' }}
                onMouseOver={e => { if (underline === 'none') e.currentTarget.style.textDecoration = 'underline' }}
                onMouseOut={e => { if (underline === 'none') e.currentTarget.style.textDecoration = 'none' }}
              >
                {icon}
                {item.text}
              </a>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {icon}
                {item.text}
              </span>
            )}
          </span>
        )
      })}
    </p>
  )
}

function SectionTitle({ text, c }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {c?.headings?.icons === 'outline' && <svg style={{ width: 16, height: 16, color: c?.colors?.applyTo?.headings ? 'var(--accent-color)' : COLOR.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
      {c?.headings?.icons === 'filled' && <svg style={{ width: 16, height: 16, color: c?.colors?.applyTo?.headings ? 'var(--accent-color)' : COLOR.primary }} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}
      <h2 style={{ 
        fontSize: c?.headings?.size === 'XL' ? '1.4em' : c?.headings?.size === 'L' ? '1.3em' : c?.headings?.size === 'S' ? '1em' : '1.2em', 
        fontWeight: 700, 
        margin: 0, 
        color: c?.colors?.applyTo?.headings ? 'var(--accent-color)' : COLOR.primary,
        textTransform: c?.headings?.capitalization === 'capitalize' ? 'capitalize' : 'uppercase',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap'
      }}>
        {text}
      </h2>
      <div style={{ height: '2px', backgroundColor: c?.colors?.applyTo?.headingsLine ? 'var(--accent-color)' : COLOR.border, flex: 1, marginTop: '2px' }} />
    </div>
  )
}

function BulletList({ bullets, c, highlightIds = [] }) {
  const filled = (bullets || []).filter(b => b.text)
  if (filled.length === 0) return null
  return (
    <ul style={{ margin: '0', paddingLeft: c?.entry?.indentBody !== false ? '18px' : '0px', listStyleType: c?.entry?.listStyle === 'hyphen' ? 'none' : 'disc' }}>
      {filled.map(b => (
        <li key={b.bulletId} id={`resume-node-${b.bulletId}`} className={highlightIds.includes(b.bulletId) ? 'highlight-persistent' : ''} style={{ fontSize: '0.95em', color: COLOR.secondary, marginBottom: 2, lineHeight: 1.45, position: 'relative' }}>
          {c?.entry?.listStyle === 'hyphen' && <span style={{ position: 'absolute', left: -14 }}>–</span>}
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
