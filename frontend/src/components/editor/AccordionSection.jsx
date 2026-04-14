import { useState } from 'react'

/* ─────────────────────────────────────────────
   AccordionSection
   Outer card that wraps a group (Experience, Education…)
───────────────────────────────────────────────*/
export function AccordionSection({ icon, iconColor = '#7c3aed', title, defaultOpen = false, count, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      background: '#ffffff',
      marginBottom: 10,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: iconColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor,
        }}>
          {icon}
        </span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#111827' }}>{title}</span>
        {count !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#9ca3af',
            background: '#f3f4f6', borderRadius: 999,
            padding: '2px 8px', marginRight: 6,
          }}>{count}</span>
        )}
        <svg
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#9ca3af', flexShrink: 0 }}
          width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 18px 18px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   EntryCard
   Collapsible per-item card (one job, school, etc.)
───────────────────────────────────────────────*/
export function EntryCard({ title, subtitle, isOpen, onToggle, onRemove, onMoveUp, onMoveDown, showMoveUp, showMoveDown, children }) {
  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      background: isOpen ? '#fafafa' : '#ffffff',
      marginBottom: 8,
      transition: 'box-shadow 0.15s',
      boxShadow: isOpen ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
    }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
      >
        {/* Grip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, opacity: 0.35 }}>
          <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" style={{ color: '#6b7280' }}>
            <circle cx={5} cy={4} r={1.5} /><circle cx={11} cy={4} r={1.5} />
            <circle cx={5} cy={8} r={1.5} /><circle cx={11} cy={8} r={1.5} />
            <circle cx={5} cy={12} r={1.5} /><circle cx={11} cy={12} r={1.5} />
          </svg>
        </div>

        {/* Title + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Untitled</span>}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Move + Remove */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {showMoveUp && (
            <button onClick={onMoveUp} title="Move up"
              style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', borderRadius: 4, display: 'flex' }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 15l-6-6-6 6" /></svg>
            </button>
          )}
          {showMoveDown && (
            <button onClick={onMoveDown} title="Move down"
              style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', borderRadius: 4, display: 'flex' }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onRemove() }} title="Remove"
            style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', borderRadius: 4, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Chevron */}
        <svg
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', color: '#9ca3af', flexShrink: 0 }}
          width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '14px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   FormField
   Labeled input or textarea with focus ring
───────────────────────────────────────────────*/
export function FormField({ label, value, onChange, placeholder, multiline, rows = 2 }) {
  const base = {
    width: '100%', padding: '7px 10px',
    border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: 13, color: '#111827', background: '#ffffff',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    resize: multiline ? 'vertical' : 'none',
  }
  const onFocus = e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)' }
  const onBlur = e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </label>
      {multiline
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={base} onFocus={onFocus} onBlur={onBlur} />
        : <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, height: 36 }} onFocus={onFocus} onBlur={onBlur} />
      }
    </div>
  )
}

/* ─────────────────────────────────────────────
   AddEntryButton
   Dashed "add" row at the bottom of each accordion
───────────────────────────────────────────────*/
export function AddEntryButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '9px 0',
        border: '1.5px dashed #d1d5db', borderRadius: 8,
        background: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 500, color: '#9ca3af',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 4, transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#7c3aed' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af' }}
    >
      + {label}
    </button>
  )
}
