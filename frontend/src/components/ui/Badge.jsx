import { cn } from '../../lib/utils'

const variants = {
  default:  'bg-bg-elevated text-text-secondary',
  blue:     'bg-accent-blue/15 text-accent-blue',
  green:    'bg-green-dim text-green',
  orange:   'bg-orange-dim text-orange',
  red:      'bg-red-dim text-red',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-medium',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}
