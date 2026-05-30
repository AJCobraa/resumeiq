import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { useNavigate } from 'react-router-dom'

const TIERS = [
  { days: 1, label: '1 Day', coins: 500, desc: 'Quick cram session' },
  { days: 7, label: '1 Week', coins: 3000, desc: 'Perfect for interview week' },
  { days: 30, label: '1 Month', coins: 12000, desc: 'Deep dive preparation' },
]

export default function EnrollmentModal({ isOpen, onClose, course, onEnrollSuccess }) {
  const [balance, setBalance] = useState(null)
  const [selectedDays, setSelectedDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const { error, success } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      api.getBillingStatus()
        .then(res => setBalance(res.total_coins))
        .catch(err => console.error('Failed to load balance', err))
    }
  }, [isOpen])

  if (!isOpen) return null

  const selectedTier = TIERS.find(t => t.days === selectedDays)
  const canAfford = balance !== null && balance >= selectedTier.coins
  const remaining = balance !== null ? balance - selectedTier.coins : null

  const handleEnroll = async () => {
    if (!canAfford) {
      error('Insufficient coins for this plan. Please top up.')
      return
    }
    setLoading(true)
    try {
      const res = await api.enrollCourse(course.course_id, selectedDays)
      success(`Successfully enrolled for ${selectedDays} ${selectedDays === 1 ? 'day' : 'days'}!`)
      setBalance(res.remaining_balance)
      onEnrollSuccess()
      onClose()
    } catch (err) {
      error(err.message || 'Failed to enroll')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="cursor-pointer absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6 text-white relative">
            <button 
              onClick={onClose}
              className="cursor-pointer absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-2">Enroll in {course.title}</h2>
            <p className="text-indigo-100 opacity-90">Select a duration that fits your interview timeline.</p>
          </div>

          <div className="p-8">
            {/* Balance Indicator */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Your Current Balance</span>
              <span className="text-xl font-bold text-slate-800">
                {balance === null ? '...' : balance.toLocaleString()} <span className="text-sm font-medium text-amber-500">coins</span>
              </span>
            </div>

            {/* Tiers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {TIERS.map(tier => {
                const isSelected = selectedDays === tier.days
                return (
                  <button
                    key={tier.days}
                    onClick={() => setSelectedDays(tier.days)}
                    className={`relative p-5 text-left rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/50 ring-4 ring-indigo-500/10' 
                        : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 bg-indigo-500 text-white p-1 rounded-full shadow-md">
                        <CheckCircle size={18} />
                      </div>
                    )}
                    <div className="text-lg font-bold text-slate-900 mb-1">{tier.label}</div>
                    <div className="text-indigo-600 font-semibold mb-3">{tier.coins.toLocaleString()} coins</div>
                    <p className="text-xs text-slate-500 leading-snug">{tier.desc}</p>
                  </button>
                )
              })}
            </div>

            {/* Footer Action */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleEnroll}
                disabled={loading || !canAfford}
                className={`cursor-pointer w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${
                  canAfford
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="animate-pulse">Processing...</span>
                ) : (
                  <>
                    Confirm — {selectedTier.coins.toLocaleString()} coins
                  </>
                )}
              </button>
              
              <div className="mt-4 text-sm font-medium text-slate-500 flex items-center gap-2">
                <Clock size={16} />
                {balance !== null ? (
                  canAfford ? (
                    <span>You'll have {remaining.toLocaleString()} coins left</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-500">Not enough coins.</span>
                      <button 
                        onClick={() => {
                          onClose()
                          navigate('/plans?highlight=popular')
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-bold underline underline-offset-2 cursor-pointer"
                      >
                        Top up now
                      </button>
                    </span>
                  )
                ) : (
                  <span>Checking balance...</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
