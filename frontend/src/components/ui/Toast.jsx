import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'

const ToastContext = createContext(null)

const toastStyles = {
  success: 'border-emerald-500/20 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shadow-[0_8px_30px_rgb(16,185,129,0.08)] bg-white/90 dark:bg-zinc-900/90',
  error:   'border-rose-500/20 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 shadow-[0_8px_30px_rgb(244,63,94,0.08)] bg-white/90 dark:bg-zinc-900/90',
  info:    'border-sky-500/20 dark:border-sky-500/30 text-sky-800 dark:text-sky-300 shadow-[0_8px_30px_rgb(14,165,233,0.08)] bg-white/90 dark:bg-zinc-900/90',
  warning: 'border-amber-500/20 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 shadow-[0_8px_30px_rgb(245,158,11,0.08)] bg-white/90 dark:bg-zinc-900/90',
}

const iconStyles = {
  success: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20',
  error:   'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20',
  info:    'bg-sky-500/10 text-sky-500 dark:bg-sky-500/20',
  warning: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20',
}

const toastIcons = {
  success: (
    <svg className="w-4 h-4 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 stroke-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 stroke-[2.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
}

function ToastItem({ toast, onClose }) {
  const { id, message, type, duration } = toast
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const remainingTimeRef = useRef(duration)

  const isCoinError = type === 'error' && message && typeof message === 'string' && (
    message.toLowerCase().includes('insufficient coins') ||
    message.toLowerCase().includes('not enough coins')
  )

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setTimeout(() => {
      onClose(id)
    }, remainingTimeRef.current)
  }, [id, onClose])

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      const elapsed = Date.now() - startTimeRef.current
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
    }
  }, [])

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [startTimer])

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className={cn(
        'pointer-events-auto w-full flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl',
        'transition-all duration-300 ease-out shadow-lg',
        'animate-in fade-in slide-in-from-top-4 duration-300',
        toastStyles[type],
      )}
    >
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', iconStyles[type])}>
        {toastIcons[type]}
      </div>
      <div className="flex flex-col gap-1.5 shrink pr-2 min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-zinc-100 break-words leading-relaxed">
          {message}
        </p>
        {isCoinError && (
          <button
            onClick={() => {
              navigate('/pricing?highlight=popular')
              onClose(id)
            }}
            className="self-start px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[11px] font-bold shadow-sm shadow-violet-600/10 transition-colors cursor-pointer"
          >
            Top Up Coins
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="ml-auto text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/80 shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random()
    // Make warnings and errors stay slightly longer to ensure readability
    const finalDuration = (type === 'warning' || type === 'error') ? Math.max(duration, 6000) : duration

    setToasts(prev => {
      const next = [...prev, { id, message, type, duration: finalDuration }]
      // Limit stacking to max 3 active toasts
      if (next.length > 3) {
        return next.slice(-3)
      }
      return next
    })
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    info:    (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }), [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container floating top center */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-[90%] sm:w-auto min-w-[320px] max-w-[420px]">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
