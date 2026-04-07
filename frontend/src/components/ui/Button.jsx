import { cn } from '../../lib/utils'

const variants = {
  primary:  'bg-accent-blue hover:bg-accent-blue-hover text-white shadow-lg shadow-accent-blue/20',
  outline:  'border border-border-default hover:border-accent-blue text-text-primary hover:text-accent-blue',
  ghost:    'text-text-muted hover:text-text-primary hover:bg-bg-elevated',
  danger:   'bg-red/10 text-red hover:bg-red/20',
  success:  'bg-green/10 text-green hover:bg-green/20',
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
