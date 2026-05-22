import React, { useState, useEffect } from 'react';
import { deepMerge } from '../../utils/deepMerge';
import { TEMPLATE_OPTIONS } from '../../lib/templateRegistry';

export const DEFAULT_CUSTOMIZATION = {
  templateId: 'default',
  title: { size: 'M', position: 'same_line', style: 'normal' },
  font: { family: 'Rubik', type: 'sans' },
  colors: {
    accent: '#7c3aed', mode: 'basic',
    applyTo: {
      name: true, jobTitle: true, headings: true, headingsLine: true,
      dots: false, dates: false, entrySubtitle: false, linkIcons: false, headerIcons: false,
    },
  },
  headings: { style: 1, capitalization: 'capitalize', size: 'M', icons: 'outline' },
  links: { underline: false, blueColor: true, showIcon: false, advancedSettings: { email: false, phone: false, linkedin: true, website: true, leetcode: true, github: true } },
  header: { textAlign: 'left', arrangement: 2, detailStyle: 'icon', iconStyle: 1 },
  name: { size: 'M', bold: true, fontType: 'body', creativeFont: 'Comfortaa' },
  summary: { displayInHeader: false, showHeading: true },
  spacing: { fontSize: 10, lineHeight: 1.25, marginLeftRight: 10, marginTopBottom: 10, spaceBetweenEntries: 1 },
  entry: { layout: 1, columnWidth: 'auto', titleSubtitleSize: 'M', subtitleStyle: 'italic', subtitlePlacement: 'next_line', indentBody: true, listStyle: 'bullet' },
  skills: { layout: 'rows', rowSpacing: 'spacious', startWithBullets: false, subinfoStyle: 'colon' },
  education: { order: 'degree_school' },
  workExperience: { order: 'employer_title', groupPromotions: false },
  region: { language: 'English (US)', dateFormat: 'YYYY MMM DD', pageFormat: 'US Letter' },
  footer: { showPageNumbers: false, showEmail: false, showName: false },
};

const FONTS = {
  sans: ['Rubik', 'Roboto', 'Lato', 'Open Sans', 'Work Sans', 'Karla', 'Mulish', 'Barlow', 'Jost', 'Fira Sans', 'Nunito', 'IBM Plex Sans', 'Source Sans Pro', 'Titillium Web', 'Asap'],
  serif: ['Merriweather', 'Playfair Display', 'Lora', 'PT Serif', 'Noto Serif', 'Crimson Text', 'EB Garamond', 'Libre Baskerville', 'Cormorant Garamond', 'Bitter', 'Domine', 'Alegreya', 'Zilla Slab', 'Tinos', 'Rokkitt'],
  mono: ['Inconsolata', 'Source Code Pro', 'IBM Plex Mono', 'Overpass Mono', 'Space Mono', 'Courier Prime', 'Fira Code', 'Ubuntu Mono', 'JetBrains Mono', 'Cousine', 'Anonymous Pro', 'PT Mono', 'Share Tech Mono', 'VT323', 'Cutive Mono'],
  creative: ['Abril Fatface', 'Amatic SC', 'Bungee Shade', 'Caveat', 'Caveat Brush', 'Comfortaa', 'Elsie', 'Lobster', 'Pacifico', 'Parisienne', 'Vibur']
};

/* ── REUSABLE SUB-COMPONENTS ── */
const SectionLabel = ({ children, style }) => (
  <div style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', marginBottom: 8, marginTop: 12, ...style }}>
    {children}
  </div>
);

const PillGroup = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {options.map((opt, i) => {
      const optVal = typeof opt === 'string' ? opt : opt.value;
      const optLabel = typeof opt === 'string' ? opt : opt.label;
      const isActive = value === optVal;
      return (
        <button
          key={i}
          onClick={() => onChange && onChange(optVal)}
          style={{
            border: isActive ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb',
            background: isActive ? '#f5f3ff' : '#fff',
            color: isActive ? '#7c3aed' : '#374151',
            borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.18s ease'
          }}
        >
          {optLabel}
        </button>
      );
    })}
  </div>
);

const Checkbox = ({ label, value, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, fontSize: 13, color: '#111827' }}>
    <div style={{
      width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: value ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb',
      background: value ? '#7c3aed' : '#fff', transition: 'all 0.18s ease'
    }}>
      {value && <svg width="10" height="8" fill="none" viewBox="0 0 10 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l2.5 2.5L9 1" /></svg>}
    </div>
    <input type="checkbox" checked={value} onChange={e => onChange && onChange(e.target.checked)} style={{ display: 'none' }} />
    {label}
  </label>
);

const ToggleSwitch = ({ label, value, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 8, fontSize: 13, color: '#111827' }}>
    {label}
    <div style={{
      width: 36, height: 20, borderRadius: 999, position: 'relative',
      background: value ? '#7c3aed' : '#d1d5db', transition: 'all 0.2s ease'
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
        left: value ? 18 : 2, transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }} />
    </div>
    <input type="checkbox" checked={value} onChange={e => onChange && onChange(e.target.checked)} style={{ display: 'none' }} />
  </label>
);

const DiscreteSlider = ({ label, value, min, max, step, unit, onChange, customSteps }) => {
  const steps = customSteps || Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => parseFloat((min + (i * step)).toFixed(2)));
  const currentIndex = steps.indexOf(value) !== -1 ? steps.indexOf(value) : steps.reduce((prev, curr, i) => Math.abs(curr - value) < Math.abs(steps[prev] - value) ? i : prev, 0);
  
  const handleMinus = () => {
    if (currentIndex > 0) onChange(steps[currentIndex - 1]);
  };
  const handlePlus = () => {
    if (currentIndex < steps.length - 1) onChange(steps[currentIndex + 1]);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#6b7280', fontSize: 11 }}>{value === 0 && label === 'Space between Entries' ? '[--]' : `${value}${unit}`}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', background: '#f3f4f6', borderRadius: 4, padding: 0, position: 'relative', height: 22 }}>
          {steps.map((s, i) => (
            <div key={i} onClick={() => onChange(s)} style={{ 
              flex: 1, height: '100%', cursor: 'pointer', position: 'relative',
              borderRight: i < steps.length - 1 ? '1px solid #e5e7eb' : 'none'
            }}>
              {currentIndex === i && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#7c3aed', borderRadius: 4, transform: 'scale(1.05)' }} />
              )}
            </div>
          ))}
        </div>
        <button onClick={handleMinus} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', color: '#374151' }}>−</button>
        <button onClick={handlePlus} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, cursor: 'pointer', color: '#374151' }}>+</button>
      </div>
    </div>
  );
};

/* ── PRESETS ── */
const PRESETS = [
  { id: 'minimal', name: 'Minimal', color: '#1a1a1a', conf: { colors: { accent: '#1a1a1a' }, font: { family: 'Roboto' }, headings: { style: 1 } } },
  { id: 'classic', name: 'Classic', color: '#0f4c81', conf: { colors: { accent: '#0f4c81' }, font: { family: 'Lato' }, headings: { style: 3 } } },
  { id: 'modern', name: 'Modern', color: '#7c3aed', conf: { colors: { accent: '#7c3aed' }, font: { family: 'Rubik' }, headings: { style: 5 } } },
  { id: 'compact', name: 'Compact', color: '#10b981', conf: { colors: { accent: '#10b981' }, font: { family: 'Open Sans' }, spacing: { spaceBetweenEntries: 0 } } },
  { id: 'creative', name: 'Creative', color: '#db2777', conf: { colors: { accent: '#db2777' }, font: { family: 'Barlow' }, headings: { style: 7 } } },
];

/* ── CUSTOMIZE PANEL ── */
export function CustomizePanel({ customization, setCustomization, canUndo, canRedo, onUndo, onRedo, onTemplateChange }) {
  const [openSection, setOpenSection] = useState('template');

  // Safely fallback to defaults for UI state
  const c = deepMerge({}, DEFAULT_CUSTOMIZATION, customization || {});

  const set = (path, value) => {
    setCustomization(prev => {
      const next = deepMerge({}, DEFAULT_CUSTOMIZATION, prev || {});
      const keys = path.split('.');
      const lastKey = keys.pop();
      let target = next;
      keys.forEach(k => { target = target[k] = target[k] || {}; });
      target[lastKey] = value;
      return next;
    });
  };

  const setPreset = (conf) => {
    setCustomization(deepMerge({}, DEFAULT_CUSTOMIZATION, conf));
  };

  const ACCORDION_SECTIONS = [
    { id: 'template', title: 'Template', render: () => (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {TEMPLATE_OPTIONS.map(tpl => (
          <div key={tpl.id} onClick={() => onTemplateChange(tpl.id)} style={{
            height: 100, borderRadius: 8, border: c.templateId === tpl.id ? '2px solid #7c3aed' : '1px solid #e5e7eb',
            boxShadow: c.templateId === tpl.id ? '0 0 0 3px #ede9fe' : 'none',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer', background: '#fff'
          }}>
            <div style={{ flex: 6, background: '#f3f4f6' }}></div>
            <div style={{ flex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#374151' }}>
              {tpl.name}
            </div>
          </div>
        ))}
      </div>
    )},
    { id: 'title', title: 'Professional Title', render: () => (
      <>
        <SectionLabel>Size</SectionLabel>
        <PillGroup options={['S','M','L']} value={c.title.size} onChange={v=>set('title.size', v)} />
        <SectionLabel>Position</SectionLabel>
        <PillGroup options={[{label:'Try Same Line',value:'same_line'},{label:'Below',value:'below'}]} value={c.title.position} onChange={v=>set('title.position', v)} />
        <SectionLabel>Style</SectionLabel>
        <PillGroup options={[{label:'Normal',value:'normal'},{label:'Italic',value:'italic'}]} value={c.title.style} onChange={v=>set('title.style', v)} />
      </>
    )},
    { id: 'font', title: 'Font', render: () => {
      const typeOptions = [{label: 'Aa Serif', value: 'serif'}, {label: 'Aa Sans', value: 'sans'}, {label: 'Aa Mono', value: 'mono'}];
      return (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {typeOptions.map(opt => (
              <button key={opt.value} onClick={() => set('font.type', opt.value)} style={{
                flex: 1, padding: '12px 0', border: c.font.type === opt.value ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                borderRadius: 8, background: c.font.type === opt.value ? '#f5f3ff' : '#fff', color: c.font.type === opt.value ? '#7c3aed' : '#374151',
                display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.1s'
              }}>
                <span style={{ fontSize: 18, fontFamily: opt.value === 'serif' ? 'serif' : opt.value === 'mono' ? 'monospace' : 'sans-serif' }}>Aa</span>
                <span style={{ fontSize: 11, marginTop: 4 }}>{opt.label.replace('Aa ', '')}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {FONTS[c.font.type].map(f => (
              <div key={f} onClick={() => set('font.family', f)} style={{
                border: c.font.family === f ? '1.5px solid #7c3aed' : '1px solid #e5e7eb',
                background: c.font.family === f ? '#f5f3ff' : '#fff', color: c.font.family === f ? '#7c3aed' : '#4b5563',
                borderRadius: 6, padding: '8px 4px', fontSize: 11, textAlign: 'center', cursor: 'pointer', fontFamily: `"${f}", sans-serif`
              }}>
                {f}
              </div>
            ))}
          </div>
        </>
      )
    }},
    { id: 'colors', title: 'Colors', render: () => {
      const swatches = ['#1a1a1a','#2563eb','#10b981','#0891b2','#0f4c81','#1e3a5f','#1a65a3','#0ea5e9','#7c3aed','#7c2d12','#b91c1c','#db2777','#dc2626','#ea580c','#16a34a','#65a30d'];
      return (
        <>
          <SectionLabel>Accent Color</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
            {swatches.map(hex => (
              <div key={hex} onClick={() => set('colors.accent', hex)} style={{
                width: 26, height: 26, borderRadius: '50%', background: hex, cursor: 'pointer', position: 'relative',
                boxShadow: c.colors.accent === hex ? `0 0 0 2px #fff, 0 0 0 4px ${hex}` : 'none'
              }}>
                {c.colors.accent === hex && <svg style={{ position: 'absolute', top: 6, left: 6 }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
              </div>
            ))}
          </div>
          <SectionLabel style={{ marginTop: 14 }}>Apply accent color to</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            {['name', 'jobTitle', 'headings', 'headingsLine', 'dots', 'dates', 'entrySubtitle', 'linkIcons', 'headerIcons'].map(k => (
              <Checkbox key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={c.colors.applyTo[k]} onChange={v => set(`colors.applyTo.${k}`, v)} />
            ))}
          </div>
        </>
      )
    }},
    { id: 'headings', title: 'Section Headings', render: () => (
      <>
        <SectionLabel>Capitalization</SectionLabel>
        <PillGroup options={['Capitalize','Uppercase']} value={c.headings.capitalization} onChange={v=>set('headings.capitalization', v.toLowerCase())} />
        <SectionLabel>Size</SectionLabel>
        <PillGroup options={['S','M','L','XL']} value={c.headings.size} onChange={v=>set('headings.size', v)} />
        <SectionLabel>Icons</SectionLabel>
        <PillGroup options={['None','Outline','Filled']} value={c.headings.icons} onChange={v=>set('headings.icons', v.toLowerCase())} />
      </>
    )},
    { id: 'links', title: 'Link Styling', render: () => (
      <>
        <Checkbox label="Underline" value={c.links.underline} onChange={v=>set('links.underline', v)} />
        <Checkbox label="Blue color" value={c.links.blueColor} onChange={v=>set('links.blueColor', v)} />
        <Checkbox label="Link icon" value={c.links.showIcon} onChange={v=>set('links.showIcon', v)} />
        <div style={{ marginTop: 16, background: '#f9fafb', borderRadius: 8, padding: 12, border: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Apply underline and blue color to header</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Email', 'Phone', 'LinkedIn', 'Website', 'LeetCode', 'GitHub'].map(key => (
              <Checkbox key={key} label={key} value={c.links.advancedSettings[key.toLowerCase()]} onChange={v => set(`links.advancedSettings.${key.toLowerCase()}`, v)} />
            ))}
          </div>
        </div>
      </>
    )},
    { id: 'name', title: 'Name', render: () => (
      <>
        <SectionLabel>Size</SectionLabel>
        <PillGroup options={['XS','S','M','L','XL']} value={c.name.size} onChange={v=>set('name.size', v)} />
        <Checkbox label="Name bold" value={c.name.bold} onChange={v=>set('name.bold', v)} />
        <SectionLabel>Font</SectionLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => set('name.fontType', 'body')} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: c.name.fontType === 'body' ? '1.5px solid #7c3aed' : '1px solid #e5e7eb', background: c.name.fontType === 'body' ? '#f5f3ff' : '#fff', color: c.name.fontType === 'body' ? '#7c3aed' : '#374151', fontSize: 12, cursor: 'pointer' }}>Body Font</button>
          <button onClick={() => set('name.fontType', 'creative')} style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: c.name.fontType === 'creative' ? '1.5px solid #7c3aed' : '1px solid #e5e7eb', background: c.name.fontType === 'creative' ? '#f5f3ff' : '#fff', color: c.name.fontType === 'creative' ? '#7c3aed' : '#374151', fontSize: 12, cursor: 'pointer' }}>Creative</button>
        </div>
        {c.name.fontType === 'creative' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {FONTS.creative.map(f => (
              <div key={f} onClick={() => set('name.creativeFont', f)} style={{
                border: c.name.creativeFont === f ? '1.5px solid #7c3aed' : '1px solid #e5e7eb',
                background: c.name.creativeFont === f ? '#f5f3ff' : '#fff', color: c.name.creativeFont === f ? '#7c3aed' : '#4b5563',
                borderRadius: 6, padding: '10px 4px', fontSize: 14, textAlign: 'center', cursor: 'pointer', fontFamily: `"${f}", cursive`
              }}>
                {f}
              </div>
            ))}
          </div>
        )}
      </>
    )},
    { id: 'summary', title: 'Summary', render: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#111827' }}>
          <input type="radio" name="summaryMode" checked={c.summary.displayInHeader && !c.summary.showHeading} onChange={() => { set('summary.displayInHeader', true); set('summary.showHeading', false); }} style={{ accentColor: '#7c3aed' }} />
          Display summary as part of header
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#111827' }}>
          <input type="radio" name="summaryMode" checked={!c.summary.displayInHeader && c.summary.showHeading} onChange={() => { set('summary.displayInHeader', false); set('summary.showHeading', true); }} style={{ accentColor: '#7c3aed' }} />
          Show summary heading
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#111827' }}>
          <input type="radio" name="summaryMode" checked={!c.summary.displayInHeader && !c.summary.showHeading} onChange={() => { set('summary.displayInHeader', false); set('summary.showHeading', false); }} style={{ accentColor: '#7c3aed' }} />
          Neither
        </label>
      </div>
    )},
    { id: 'spacing', title: 'Spacing', render: () => (
      <>
        <DiscreteSlider label="Font Size" value={c.spacing.fontSize} min={8} max={12} step={0.5} unit="pt" onChange={v=>set('spacing.fontSize', v)} />
        <DiscreteSlider label="Line Height" value={c.spacing.lineHeight} min={1.0} max={1.6} step={0.05} unit="" onChange={v=>set('spacing.lineHeight', v)} customSteps={[1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6]} />
        <DiscreteSlider label="Left & Right Margin" value={c.spacing.marginLeftRight} min={5} max={20} step={1} unit="mm" onChange={v=>set('spacing.marginLeftRight', v)} />
        <DiscreteSlider label="Top & Bottom Margin" value={c.spacing.marginTopBottom} min={5} max={20} step={1} unit="mm" onChange={v=>set('spacing.marginTopBottom', v)} />
        <DiscreteSlider label="Space between Entries" value={c.spacing.spaceBetweenEntries} min={0} max={3} step={1} unit="" onChange={v=>set('spacing.spaceBetweenEntries', v)} />
      </>
    )},
    { id: 'entry', title: 'Entry Layout', render: () => (
      <>
        <SectionLabel>Column Width</SectionLabel>
        <PillGroup options={['Auto','Manual']} value={c.entry.columnWidth} onChange={v=>set('entry.columnWidth', v.toLowerCase())} />
        <SectionLabel>Title & subtitle size</SectionLabel>
        <PillGroup options={['S','M','L']} value={c.entry.titleSubtitleSize} onChange={v=>set('entry.titleSubtitleSize', v)} />
        <SectionLabel>Subtitle style</SectionLabel>
        <PillGroup options={['Normal','Bold','Italic']} value={c.entry.subtitleStyle} onChange={v=>set('entry.subtitleStyle', v.toLowerCase())} />
        <SectionLabel>Subtitle placement</SectionLabel>
        <PillGroup options={[{label:'Try Same Line',value:'same_line'},{label:'Next Line',value:'next_line'}]} value={c.entry.subtitlePlacement} onChange={v=>set('entry.subtitlePlacement', v)} />
        <SectionLabel>Description indentation</SectionLabel>
        <Checkbox label="Indent body" value={c.entry.indentBody} onChange={v=>set('entry.indentBody', v)} />
        <SectionLabel>List style</SectionLabel>
        <PillGroup options={[{label:'• Bullet',value:'bullet'},{label:'– Hyphen',value:'hyphen'}]} value={c.entry.listStyle} onChange={v=>set('entry.listStyle', v)} />
      </>
    )},
    { id: 'skills', title: 'Skills', render: () => (
      <>
        <PillGroup options={['Grid','Rows','Compact','Bubble','Level']} value={c.skills.layout} onChange={v=>set('skills.layout', v.toLowerCase())} />
        <SectionLabel>Row spacing</SectionLabel>
        <PillGroup options={['Tight','Spacious']} value={c.skills.rowSpacing} onChange={v=>set('skills.rowSpacing', v.toLowerCase())} />
        <Checkbox label="Start rows with bullets" value={c.skills.startWithBullets} onChange={v=>set('skills.startWithBullets', v)} />
        <SectionLabel>Subinfo Style</SectionLabel>
        <PillGroup options={[{label:': Colon',value:'colon'},{label:'– Dash',value:'dash'},{label:'() Bracket',value:'bracket'}]} value={c.skills.subinfoStyle} onChange={v=>set('skills.subinfoStyle', v)} />
      </>
    )},
    { id: 'education', title: 'Education', render: () => (
      <>
        <SectionLabel>Title & Subtitle Order</SectionLabel>
        <PillGroup options={[{label:'Degree, School',value:'degree_school'},{label:'School, Degree',value:'school_degree'}]} value={c.education.order} onChange={v=>set('education.order', v)} />
      </>
    )},
    { id: 'work', title: 'Work Experience', render: () => (
      <>
        <SectionLabel>Order title/subtitle</SectionLabel>
        <PillGroup options={[{label:'Job Title – Employer',value:'title_employer'},{label:'Employer – Job Title',value:'employer_title'}]} value={c.workExperience.order} onChange={v=>set('workExperience.order', v)} />
        <Checkbox label="Group promotions" value={c.workExperience.groupPromotions} onChange={v=>set('workExperience.groupPromotions', v)} />
      </>
    )},
    { id: 'region', title: 'Language & Region', render: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['language', 'dateFormat', 'pageFormat'].map(k => (
          <select key={k} value={c.region[k]} onChange={e => set(`region.${k}`, e.target.value)} style={{
            border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', width: '100%'
          }}>
            {k === 'language' && ['English (US)', 'English (UK)', 'French', 'German', 'Spanish'].map(o => <option key={o} value={o}>{o}</option>)}
            {k === 'dateFormat' && ['YYYY MMM DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MMM YYYY'].map(o => <option key={o} value={o}>{o}</option>)}
            {k === 'pageFormat' && ['US Letter', 'A4'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>
    )},
    { id: 'footer', title: 'Footer', render: () => (
      <>
        <Checkbox label="Page numbers" value={c.footer.showPageNumbers} onChange={v=>set('footer.showPageNumbers', v)} />
        <Checkbox label="Email" value={c.footer.showEmail} onChange={v=>set('footer.showEmail', v)} />
        <Checkbox label="Name" value={c.footer.showName} onChange={v=>set('footer.showName', v)} />
      </>
    )},
  ];

  return (
    <div style={{ padding: 12, paddingBottom: 60, position: 'relative', height: '100%' }}>
      {/* Design Presets */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Apply a design template</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>Update your entire resume design with one click 💡</div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
          {PRESETS.map(p => (
            <div key={p.id} onClick={() => setPreset(p.conf)} style={{
              minWidth: 80, height: 100, borderRadius: 8, border: '1.5px solid #e5e7eb', overflow: 'hidden', cursor: 'pointer',
              background: p.color, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', transition: 'all 0.18s ease'
            }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ background: 'rgba(255,255,255,0.9)', width: '100%', textAlign: 'center', fontSize: 10, fontWeight: 600, padding: '4px 0' }}>{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Accordion */}
      {ACCORDION_SECTIONS.map((sec, i) => {
        const isOpen = openSection === sec.id;
        return (
          <div key={sec.id} style={{ borderTop: i === 0 ? '1px solid #f0f0f0' : 'none', borderBottom: '1px solid #f0f0f0' }}>
            <button onClick={() => setOpenSection(isOpen ? null : sec.id)} style={{
              width: '100%', padding: '14px 4px', background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#111827'
            }}>
              {sec.title}
              <svg style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div style={{ maxHeight: isOpen ? 2000 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
              <div style={{ padding: '0 4px 16px' }}>
                {sec.render()}
              </div>
            </div>
          </div>
        );
      })}

      {/* Sticky Undo/Redo Bar */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #f0f0f0',
        padding: '12px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10,
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={onUndo} disabled={!canUndo} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: canUndo ? 'pointer' : 'default', color: canUndo ? '#374151' : '#d1d5db', transition: 'color 0.2s' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l5 5M3 10l5-5"/></svg> Undo
          </button>
          <button onClick={onRedo} disabled={!canRedo} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: canRedo ? 'pointer' : 'default', color: canRedo ? '#374151' : '#d1d5db', transition: 'color 0.2s' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transform: 'scaleX(-1)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l5 5M3 10l5-5"/></svg> Redo
          </button>
        </div>
      </div>
    </div>
  );
}
