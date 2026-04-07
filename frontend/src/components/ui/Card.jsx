import { cn } from '../../lib/utils'

export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-bg-card border border-border-default rounded-[8px] p-5',
        'transition-all duration-200',
        hover && 'hover:border-border-hover hover:shadow-lg hover:shadow-black/20',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
