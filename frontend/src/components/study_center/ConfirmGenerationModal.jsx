import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap } from 'lucide-react'

export default function ConfirmGenerationModal({ isOpen, onClose, onConfirm, model, title, actionText, generating }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!generating ? onClose : undefined}
          className="cursor-pointer absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-indigo-900/20 overflow-hidden border border-slate-200"
        >
          <div className="bg-slate-50/80 px-8 py-6 border-b border-slate-100 relative">
            <button 
              onClick={onClose}
              disabled={generating}
              className="cursor-pointer absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              {title}
            </h2>
          </div>

          <div className="p-8">
            <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
              You are about to use AI generation. Please confirm the model and coin cost below.
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Engine</span>
                <span className="text-base font-bold text-slate-800">
                  {model?.display_name || 'Unknown'}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cost</span>
                <span className="text-lg font-black text-indigo-600 flex items-center gap-1.5">
                  {model?.coin_cost || 0} <span className="text-sm font-bold text-amber-500">coins</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                disabled={generating}
                className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgb(79,70,229,0.23)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  actionText
                )}
              </button>
              <button
                onClick={onClose}
                disabled={generating}
                className="w-full py-3.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
