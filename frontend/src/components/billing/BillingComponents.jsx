import { motion, AnimatePresence } from 'framer-motion'

export function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color || ''}`}>{Number(value || 0).toLocaleString()}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  )
}

export function BillingToggle({ cycle, setCycle }) {
  const options = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly', bonus: 'Save 10%' },
    { id: 'biannual', label: '6 Months', bonus: 'Save 15%' }
  ]
  return (
    <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 shadow-inner">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setCycle(opt.id)}
          className={`relative px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
            cycle === opt.id ? 'text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {cycle === opt.id && (
            <motion.span
              layoutId="cyclePill"
              className="absolute inset-0 bg-purple-600 rounded-xl shadow-lg shadow-purple-600/20"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {opt.label}
            {opt.bonus && !cycle.includes(opt.id) && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">
                {opt.bonus}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

export function CurrencyToggle({ currency, setCurrency }) {
  return (
    <div className="flex bg-bg-card border border-border-default rounded-xl p-1">
      {['INR', 'USD'].map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${currency === c ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
        >
          {c === 'INR' ? '₹ INR' : '$ USD'}
        </button>
      ))}
    </div>
  )
}

export function PaymentHistory({ history }) {
  const STATUS_COLORS = {
    success: 'text-green',
    pending: 'text-yellow-400',
    failed: 'text-red',
    refunded: 'text-text-muted',
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Payment History</h2>
      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-bg-elevated/40">
              <th className="text-left px-4 py-3 font-medium text-text-muted">Date</th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">Type</th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">Coins</th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">Amount</th>
              <th className="text-center px-4 py-3 font-medium text-text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((tx) => (
              <tr key={tx.id} className="border-b border-border-default/50 last:border-none hover:bg-bg-elevated/30 transition-colors">
                <td className="px-4 py-3 text-text-muted">{tx.date ? new Date(tx.date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">{tx.type.includes('subscription') ? 'Subscription' : 'Top-up'}</td>
                <td className="px-4 py-3 text-right font-medium text-accent-blue">+{tx.coins.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-medium">{tx.currency === 'INR' ? `₹${tx.amountInr}` : `$${tx.amountUsd}`}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold uppercase ${STATUS_COLORS[tx.status] || 'text-text-muted'}`}>{tx.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CancelModal({ show, cancelling, periodEnd, onCancel, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-card border border-border-default rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold mb-2">Cancel Subscription?</h3>
            <p className="text-sm text-text-muted mb-6">
              Your access will continue until {periodEnd ? new Date(periodEnd).toLocaleDateString() : 'the end of your billing period'}.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary cursor-pointer">Keep Plan</button>
              <button
                disabled={cancelling}
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red text-white hover:bg-red/90 cursor-pointer disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
