/**
 * MetaEditor — edits the personal-info section (name, email, phone, etc.)
 */
const FIELDS = [
  { key: 'name',     label: 'Full Name',        placeholder: 'John Doe' },
  { key: 'title',    label: 'Job Title',         placeholder: 'Senior Frontend Engineer' },
  { key: 'email',    label: 'Email',             placeholder: 'john@example.com' },
  { key: 'phone',    label: 'Phone',             placeholder: '+1 (555) 123-4567' },
  { key: 'location', label: 'Location',          placeholder: 'San Francisco, CA' },
  { key: 'linkedin', label: 'LinkedIn URL',      placeholder: 'linkedin.com/in/johndoe' },
  { key: 'github',   label: 'GitHub URL',        placeholder: 'github.com/johndoe' },
  { key: 'blog',     label: 'Portfolio / Blog',  placeholder: 'johndoe.dev' },
  { key: 'leetcode', label: 'LeetCode',          placeholder: 'leetcode.com/johndoe' },
]

export default function MetaEditor({ meta, onChange }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
        Personal Information
      </h3>

      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-xs font-medium text-text-muted mb-1 block">{label}</label>
          <input
            type="text"
            value={meta[key] || ''}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-bg-elevated border border-border-default rounded-[6px] text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none transition-colors"
          />
        </div>
      ))}

      {/* Professional Summary — textarea */}
      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">Professional Summary</label>
        <textarea
          value={meta.summary || ''}
          onChange={(e) => onChange('summary', e.target.value)}
          placeholder="3-4 sentence summary of your career highlights and expertise..."
          rows={4}
          className="w-full px-3 py-2 bg-bg-elevated border border-border-default rounded-[6px] text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none transition-colors resize-none"
        />
      </div>
    </div>
  )
}
