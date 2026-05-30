import { motion, AnimatePresence } from 'framer-motion'

const PLAN_THEMES = {
  free: {
    gradient: 'from-slate-50 to-slate-100/50',
    border: 'border-slate-200',
    accent: 'text-slate-600',
    badge: 'bg-slate-200 text-slate-700',
    button: 'bg-slate-800 hover:bg-slate-900',
    coinBg: 'bg-slate-200/50'
  },
  starter: {
    gradient: 'from-blue-50 to-blue-100/50',
    border: 'border-blue-200',
    accent: 'text-blue-600',
    badge: 'bg-blue-500 text-white',
    button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    coinBg: 'bg-blue-100/50'
  },
  pro: {
    gradient: 'from-purple-50 to-purple-100/50',
    border: 'border-purple-200',
    accent: 'text-purple-600',
    badge: 'bg-purple-600 text-white',
    button: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200',
    coinBg: 'bg-purple-100/50'
  },
  growth: {
    gradient: 'from-amber-50 to-amber-100/50',
    border: 'border-amber-200',
    accent: 'text-amber-600',
    badge: 'bg-amber-500 text-white',
    button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
    coinBg: 'bg-amber-100/50'
  },
}

const CYCLE_COIN_MULTIPLIERS = { monthly: 1.0, quarterly: 1.1, biannual: 1.15 }
const CYCLE_MONTHS = { monthly: 1, quarterly: 3, biannual: 6 }

export default function PlanCard({ 
  plan, 
  idx, 
  currentPlan, 
  cycle, 
  currency, 
  processing, 
  handleSubscribe, 
  setCancelModal,
  billing,
  isOnPaid
}) {
  const isCurrent = plan.plan_id === currentPlan
  const isFree = plan.plan_id === 'free'
  const theme = PLAN_THEMES[plan.plan_id] || PLAN_THEMES.free
  
  const months = CYCLE_MONTHS[cycle]
  const base = currency === 'INR' ? plan.price_inr : plan.price_usd
  const total = base * months
  const symbol = currency === 'INR' ? '₹' : '$'
  const perMonth = base

  const monthlyCoins = plan.coins_monthly
  const totalCoins = Math.round(monthlyCoins * CYCLE_COIN_MULTIPLIERS[cycle] * CYCLE_MONTHS[cycle])

  const features = {
    free: [
      '100 one-time coins on signup',
      '1 saved resume',
      '~1 full ATS analysis workflow',
      'Resume parsing & structured editor',
      'Basic interview prep',
    ],
    starter: [
      '22,750 coins/month (base)',
      '3 saved resumes',
      '~255 full ATS workflows/month',
      'Resume parsing & editor',
      'Interview prep (FAANG / Unicorn / Standard tier)',
      'Bullet rewriter',
      'Coin top-ups available',
    ],
    pro: [
      '82,000 coins/month (base)',
      '10 saved resumes',
      '~921 full ATS workflows/month',
      'Everything in Starter',
      'Vector-based semantic job matching',
      'Priority AI processing',
      'Coin top-ups available',
    ],
    growth: [
      '182,000 coins/month (base)',
      'Unlimited saved resumes',
      '~2,045 full ATS workflows/month',
      'Everything in Pro',
      'Early access to new AI features',
      'Cover letter generation (coming soon)',
      'LinkedIn optimizer (coming soon)',
      'Auto-apply (coming soon)',
    ],
  }

  const planFeatures = features[plan.plan_id] || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
      className={`relative bg-gradient-to-br ${theme.gradient} 
        border ${theme.border} 
        rounded-3xl p-8 flex flex-col
        ${isCurrent ? 'ring-2 ring-purple-500/20' : ''}
        ${plan.plan_id === 'pro' ? 'lg:scale-105 shadow-xl shadow-purple-500/5 z-10' : ''}
        transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 min-h-[580px]`}
    >
      {/* Badge */}
      {(isCurrent || plan.plan_id === 'pro' || plan.plan_id === 'growth') && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
            isCurrent ? 'bg-slate-900 text-white' : theme.badge
          }`}>
            {isCurrent ? 'Current Plan' : plan.plan_id === 'pro' ? 'Most Popular' : 'Best Value'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h3 className={`text-xl font-bold tracking-tight ${theme.accent}`}>
          {plan.display_name}
        </h3>
        
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={cycle + plan.plan_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {isFree ? (
                <p className="text-4xl font-black text-slate-900">Free</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">
                      {symbol}{perMonth.toLocaleString()}
                    </span>
                    <span className="text-slate-500 font-medium">/mo</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {symbol}{total.toLocaleString()} billed {cycle === 'monthly' ? 'monthly' : cycle === 'quarterly' ? 'every 3 months' : 'every 6 months'}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Coins Section */}
      <div className={`rounded-2xl p-5 mb-8 ${theme.coinBg} border border-white/50 shadow-inner`}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total coins</p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <motion.span
            key={cycle + plan.plan_id + 'c'}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-3xl font-black ${theme.accent}`}
          >
            {totalCoins.toLocaleString()}
          </motion.span>
          
          {cycle !== 'monthly' && (
            <span className="px-3 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-900 shadow-sm border border-slate-100">
              {cycle === 'quarterly' ? '+10% more coins' : '+15% more coins'}
            </span>
          )}
        </div>
      </div>

      {/* Features List */}
      <ul className="flex-1 space-y-3.5 mb-8">
        {planFeatures.map((feature, fIdx) => (
          <li key={fIdx} className="flex items-start gap-3 group">
            <div className={`mt-0.5 rounded-full p-0.5 ${theme.accent} bg-white shadow-sm border ${theme.border}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-[13px] text-slate-600 font-medium leading-relaxed group-hover:text-slate-900 transition-colors">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* Action Button */}
      <div className="mt-auto">
        {isCurrent ? (
          isOnPaid && billing?.status === 'active' ? (
            <button className="cursor-pointer"
              onClick={() => setCancelModal(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold border-2 border-slate-200
                text-slate-400 hover:text-red-500 hover:border-red-200 transition-all duration-300 cursor-pointer bg-white/50 hover:bg-red-50"
            >
              Cancel Subscription
            </button>
          ) : (
            <div className="w-full py-3.5 rounded-2xl text-sm font-bold text-center text-slate-500 bg-slate-100 border-2 border-slate-200">
              {billing?.status === 'cancelled' ? 'Cancelled' : 'Active Plan'}
            </div>
          )
        ) : isFree ? null : (
          <button className="cursor-pointer"
            disabled={!!processing}
            onClick={() => handleSubscribe(plan.plan_id)}
            className={`group relative w-full py-4 rounded-2xl text-sm font-black transition-all duration-300 cursor-pointer overflow-hidden
              ${processing === plan.plan_id
                ? 'bg-slate-100 text-slate-400 animate-pulse'
                : `${theme.button} text-white shadow-xl hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0`}`}
          >
            <span className="relative z-10">
              {processing === plan.plan_id ? 'Processing...' : `Upgrade to ${plan.display_name}`}
            </span>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

