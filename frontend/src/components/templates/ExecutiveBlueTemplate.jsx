/**
 * ExecutiveBlueTemplate — ATS-safe premium resume template.
 * Display-only React component — never modifies data.
 * Features a deep blue header, serif typography, and multi-column skills.
 * Inline styles only — no Tailwind (per AGENTS.md).
 */

function stripScheme(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '')
}

function ensureHttp(url) {
  if (!url) return '#'
  return url.startsWith('http') ? url : `https://${url}`
}

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
  fontSize: '1em',
  lineHeight: '1.5',
  boxSizing: 'border-box',
  backgroundColor: COLOR.white,
  minHeight: '100%',
}

export default function ExecutiveBlueTemplate({ resume, customization, highlightIds = [] }) {
  if (!resume) return null

  const { meta = {}, sections = [] } = resume
  const c = customization;

  const dynamicBaseStyle = {
    ...baseStyle,
    fontFamily: `'${c?.font?.family ?? 'Georgia'}', serif`,
    fontSize: `${((c?.spacing?.fontSize ?? 10) * 1.333).toFixed(1)}px`,
    lineHeight: c?.spacing?.lineHeight ?? 1.5,
    padding: [
      `${((c?.spacing?.marginTopBottom ?? 10) * 3.7795).toFixed(1)}px`,
      `${((c?.spacing?.marginLeftRight ?? 10) * 3.7795).toFixed(1)}px`
    ].join(' '),
    '--accent-color': c?.colors?.accent ?? COLOR.primary,
    '--entry-gap': ['4px','8px','14px','22px'][c?.spacing?.spaceBetweenEntries ?? 1],
  };

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
    <div style={dynamicBaseStyle} id="executive-blue-template">
      {/* ── Header Section (Deep Blue) ────────────────────────────────── */}
      <div style={{ backgroundColor: c?.colors?.applyTo?.name ? 'var(--accent-color)' : COLOR.primary, color: COLOR.white, padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, textAlign: c?.header?.textAlign || 'left' }}>
          <div style={{ marginBottom: '12px' }}>
            {meta.name && (
              <span style={{ 
                fontFamily: c?.name?.fontType === 'creative' && c?.name?.creativeFont ? `"${c.name.creativeFont}", cursive` : undefined,
                fontSize: c?.name?.size === 'XL' ? '3.4em' : c?.name?.size === 'L' ? '3em' : c?.name?.size === 'S' ? '2.2em' : c?.name?.size === 'XS' ? '2em' : '2.6em', 
                fontWeight: c?.name?.bold !== false ? 700 : 400, 
                letterSpacing: '0.5px', 
                marginRight: '12px',
                display: c?.title?.position === 'below' ? 'block' : 'inline'
              }}>
                {meta.name}
              </span>
            )}
            {meta.title && (
              <span style={{ 
                fontSize: c?.title?.size === 'L' ? '1.8em' : c?.title?.size === 'S' ? '1.4em' : '1.6em', 
                fontStyle: c?.title?.style === 'italic' ? 'italic' : 'normal', 
                fontWeight: 400, 
                color: c?.colors?.applyTo?.jobTitle ? 'var(--accent-color)' : '#E0E7FF' 
              }}>
                {meta.title}
              </span>
            )}
          </div>
          <ContactRow meta={meta} c={c} />
        </div>
      </div>

      {/* ── Body Section ───────────────────────────────── */}
      <div style={{ padding: '30px 48px' }}>
        
        {/* ── Summary ───────────────────────────────── */}
        {meta.summary && (
          <div style={{ marginBottom: '20px' }}>
            {c?.summary?.showHeading !== false && <SectionTitle text="Summary" c={c} />}
            <p id="resume-node-summary" className={highlightIds.includes('summary') ? 'highlight-persistent' : ''} style={{ color: COLOR.text, margin: '8px 0 0', fontSize: '1em', lineHeight: 1.6, textAlign: 'justify' }}>
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
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Professional Experience" c={c} />
      <div style={{ marginTop: '12px' }}>
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
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Education" c={c} />
      <div style={{ marginTop: '12px' }}>
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
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Skills" c={c} />
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: c?.skills?.layout === 'grid' || c?.skills?.layout === 'bubble' ? 'row' : 'column', flexWrap: 'wrap', gap: c?.skills?.layout === 'grid' || c?.skills?.layout === 'bubble' ? '12px' : (c?.skills?.rowSpacing === 'tight' ? '4px' : '8px') }}>
        {allCats.map(cat => {
          if (c?.skills?.layout === 'bubble') {
            return (
              <div key={cat.categoryId} id={`resume-node-${cat.categoryId}`} className={highlightIds.includes(cat.categoryId) ? 'highlight-persistent' : ''} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(cat.items || []).map((skill, idx) => (
                  <span key={idx} style={{ background: '#f8fafc', color: COLOR.text, borderRadius: 16, padding: '4px 10px', fontSize: '0.9em', border: `1px solid ${COLOR.divider}` }}>
                    {skill}
                  </span>
                ))}
              </div>
            );
          }
          if (c?.skills?.layout === 'grid') {
            return (
              <div key={cat.categoryId} id={`resume-node-${cat.categoryId}`} className={highlightIds.includes(cat.categoryId) ? 'highlight-persistent' : ''} style={{ flex: '1 1 30%', minWidth: '150px' }}>
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
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Projects" c={c} />
      <div style={{ marginTop: '12px' }}>
        {allItems.map((item) => (
          <ProjectEntry key={item.projectId} item={item} c={c} highlightIds={highlightIds} />
        ))}
      </div>
    </div>
  )
}

function CertificationsGroup({ sections, c }) {
  const allItems = sections.flatMap(s => (s.items || []).filter(c => c.name))
  if (allItems.length === 0) return null
  return (
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Certifications" c={c} />
      <div style={{ marginTop: '8px' }}>
        {allItems.map((item, idx) => (
          <div key={item.certId || idx} style={{ marginBottom: 'var(--entry-gap)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1.05em', color: COLOR.text }}>{item.name}</span>
                {item.issuer && (
                  <span style={{ fontStyle: 'italic', fontSize: '1em', color: COLOR.secondary }}> — {item.issuer}</span>
                )}
              </div>
              {item.year && (
                <span style={{ fontSize: '1em', color: COLOR.text }}>{item.year}</span>
              )}
            </div>
            {item.description && (
              <p style={{ fontSize: '1em', color: COLOR.secondary, margin: '2px 0 0' }}>{item.description}</p>
            )}
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
    <div style={{ marginBottom: '20px' }}>
      <SectionTitle text="Achievements" c={c} />
      <BulletList bullets={allBullets} c={c} highlightIds={highlightIds} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   Individual Entry Components
   ────────────────────────────────────────────────────── */

function ExperienceEntry({ section, c, highlightIds = [] }) {
  const dateStr = [section.startDate, section.endDate].filter(Boolean).join(' – ')
  
  return (
    <div style={{ marginBottom: 'var(--entry-gap)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1em', color: COLOR.text }}>{section.role}</span>
        <span style={{ fontSize: '1em', color: c?.colors?.applyTo?.dates ? 'var(--accent-color)' : COLOR.text }}>{dateStr}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        {section.company && <span style={{ fontStyle: c?.entry?.subtitleStyle === 'italic' ? 'italic' : 'normal', fontSize: '1em', color: c?.colors?.applyTo?.entrySubtitle ? 'var(--accent-color)' : COLOR.secondary }}>{section.company}</span>}
        {section.location && <span style={{ fontSize: '1em', color: COLOR.text }}>{section.location}</span>}
      </div>
      <BulletList bullets={section.bullets} c={c} highlightIds={highlightIds} />
    </div>
  )
}

function EducationEntry({ item, c }) {
  const dateStr = [item.startYear, item.endYear].filter(Boolean).join(' – ')
  
  return (
    <div style={{ marginBottom: 'var(--entry-gap)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 700, fontSize: '1.05em', color: COLOR.text }}>{item.degree}</span>
        <span style={{ fontSize: '1em', color: c?.colors?.applyTo?.dates ? 'var(--accent-color)' : COLOR.text }}>{dateStr}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {item.institution && <span style={{ fontStyle: c?.entry?.subtitleStyle === 'italic' ? 'italic' : 'normal', fontSize: '1em', color: c?.colors?.applyTo?.entrySubtitle ? 'var(--accent-color)' : COLOR.secondary }}>{item.institution}</span>}
        {item.location && <span style={{ fontSize: '1em', color: COLOR.text }}>{item.location}</span>}
      </div>
      {item.grade && (
        <p style={{ fontSize: '1em', color: COLOR.secondary, margin: '2px 0 0' }}>GPA: {item.grade}</p>
      )}
    </div>
  )
}

function ProjectEntry({ item, c, highlightIds = [] }) {
  const dateStr = [item.startDate, item.endDate].filter(Boolean).join(' – ')
  
  return (
    <div style={{ marginBottom: 'var(--entry-gap)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '1.1em', color: COLOR.text }}>{item.name}</span>
          {item.techStack && (
            <span style={{ fontStyle: 'italic', color: COLOR.secondary, fontSize: '1em', marginLeft: 8 }}>
              | {item.techStack}
            </span>
          )}
        </div>
        <span style={{ fontSize: '1em', color: c?.colors?.applyTo?.dates ? 'var(--accent-color)' : COLOR.text }}>{dateStr}</span>
      </div>
      {item.institution && (
        <p style={{ fontSize: '1em', fontStyle: c?.entry?.subtitleStyle === 'italic' ? 'italic' : 'normal', color: c?.colors?.applyTo?.entrySubtitle ? 'var(--accent-color)' : COLOR.secondary, margin: '0 0 4px 0' }}>{item.institution}</p>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: '8px 24px', fontSize: '0.95em', color: COLOR.white }}>
      {items.map((item, idx) => {
        const isAdvanced = c?.links?.advancedSettings?.[item.id];
        const isLink = !!item.href;
        const color = (isLink && (c?.links?.blueColor || isAdvanced)) ? '#60A5FA' : 'inherit'; // Lighter blue for dark background
        const underline = (isLink && (c?.links?.underline || isAdvanced)) ? 'underline' : 'none';
        const iconColor = c?.colors?.applyTo?.headerIcons ? 'var(--accent-color)' : 'currentColor';
        const iconStyle = { width: 12, height: 12, color: iconColor };

        let icon = null;
        if (item.id === 'email') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
        else if (item.id === 'phone') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
        else if (item.id === 'location') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
        else if (item.id === 'linkedin') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
        else if (item.id === 'github') icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>;
        else icon = <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;

        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(!c?.links || c?.links?.showIcon !== false) && icon}
            {item.href ? (
              <a href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined} style={{ color, textDecoration: underline }}>
                {item.text}
              </a>
            ) : (
              <span>{item.text}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SectionTitle({ text, c }) {
  return (
    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {c?.headings?.icons === 'outline' && <svg style={{ width: 18, height: 18, color: c?.colors?.applyTo?.headings ? 'var(--accent-color)' : COLOR.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
      {c?.headings?.icons === 'filled' && <svg style={{ width: 18, height: 18, color: c?.colors?.applyTo?.headings ? 'var(--accent-color)' : COLOR.primary }} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}
      <h2 style={{ 
        fontSize: c?.headings?.size === 'XL' ? '1.5em' : c?.headings?.size === 'L' ? '1.4em' : c?.headings?.size === 'S' ? '1.1em' : '1.3em', 
        fontWeight: 700, 
        margin: 0, 
        color: c?.colors?.applyTo?.headings ? 'var(--accent-color)' : COLOR.primary,
        textTransform: c?.headings?.capitalization === 'uppercase' ? 'uppercase' : 'capitalize',
        display: 'inline-block',
        borderBottom: `2px solid ${c?.colors?.applyTo?.headingsLine ? 'var(--accent-color)' : COLOR.primary}`,
        paddingBottom: '2px'
      }}>
        {text}
      </h2>
    </div>
  )
}

function BulletList({ bullets, c, highlightIds = [] }) {
  const filled = (bullets || []).filter(b => b.text)
  if (filled.length === 0) return null
  return (
    <ul style={{ margin: '4px 0 0', paddingLeft: c?.entry?.indentBody !== false ? '18px' : '0px', listStyleType: c?.entry?.listStyle === 'hyphen' ? 'none' : 'disc' }}>
      {filled.map((b) => (
        <li key={b.bulletId} id={`resume-node-${b.bulletId}`} className={highlightIds.includes(b.bulletId) ? 'highlight-persistent' : ''} style={{ fontSize: '1em', color: COLOR.text, marginBottom: '4px', lineHeight: 1.5, position: 'relative' }}>
          {c?.entry?.listStyle === 'hyphen' && <span style={{ position: 'absolute', left: -14 }}>–</span>}
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
