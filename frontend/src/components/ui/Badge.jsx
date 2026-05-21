import { cn } from '../../lib/utils'

const variants = {
  default:  'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/50 dark:border-zinc-700/50',
  blue:     'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  green:    'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  orange:   'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  red:      'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20',
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
