import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const gentleSpring = { type: 'spring', stiffness: 200, damping: 24 }

export default function Modal({ isOpen, onClose, title, headerAction, headerEnd, headerMeta, size = 'md', children }) {
  // Expanded sizes to give the dashboard more horizontal space
  const widths = { 
    sm: 'max-w-md', 
    md: 'max-w-lg', 
    lg: 'max-w-3xl',
    xl: 'max-w-4xl' 
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Panel Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={gentleSpring}
            className={`relative w-full ${widths[size] || widths.md} bg-white rounded-2xl border border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col max-h-[90vh] overflow-hidden`}
          >
            
            {/* Header (Sticky at top) */}
            {title && (
              <div className="flex flex-col px-6 pt-5 pb-4 border-b border-slate-100/80 shrink-0 bg-white z-10">
                {/* Row 1: title + headerAction (View Listing) + headerEnd (View Resume) + close */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 truncate">{title}</h2>
                    {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {headerEnd && <div>{headerEnd}</div>}
                    <button
                      onClick={onClose}
                      className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Row 2 & 3: headerMeta (company · portal · resume) */}
                {headerMeta && <div className="mt-2 text-balance">{headerMeta}</div>}
              </div>
            )}
            
            {/* Scrollable Content Area */}
            <div className="p-6 overflow-y-auto">
              {children}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
