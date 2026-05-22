import { cn } from '../../lib/utils'

const variants = {
  primary:  'bg-primary hover:bg-brand-dark text-primary-foreground shadow-glow',
  outline:  'border border-border hover:border-primary text-foreground hover:text-primary bg-card',
  ghost:    'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
  danger:   'bg-destructive/10 text-destructive hover:bg-destructive/20',
  success:  'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-[6px]',
        'transition-all duration-200 ease-out cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
