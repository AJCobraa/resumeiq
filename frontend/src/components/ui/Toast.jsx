import { createContext, useContext, useState, useCallback } from 'react'
import { cn } from '../../lib/utils'

const ToastContext = createContext(null)

const toastStyles = {
  success: 'border-green/30 bg-green-dim',
  error:   'border-red/30 bg-red-dim',
  info:    'border-accent-blue/30 bg-accent-blue-glow',
  warning: 'border-orange/30 bg-orange-dim',
}

const toastIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    info:    (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto px-4 py-3 rounded-[8px] border',
              'shadow-lg shadow-black/30 min-w-[280px] max-w-[400px]',
              'animate-slide-in flex items-center gap-3',
              toastStyles[t.type],
            )}
          >
            <span className="text-lg">{toastIcons[t.type]}</span>
            <p className="text-sm text-text-primary">{t.message}</p>
          </div>
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
