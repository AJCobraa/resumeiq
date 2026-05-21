import { motion } from 'framer-motion'

const TOP_UP_OPERATIONS = [
  { name: 'Parse Resume', cost: 35 },
  { name: 'ATS Analysis', cost: 30 },
  { name: 'Generate Interview Prep', cost: 12 },
  { name: 'Rewrite Bullet', cost: 3 },
  { name: 'Embed Resume', cost: 6 },
  { name: 'Embed JD', cost: 3 },
]

export default function TopUpSection({
  packs,
  currency,
  isOnPaid,
  processing,
  handleTopUp,
  highlightPopular
}) {
  return (
    <div className="space-y-8" id="top-up-section">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Need a quick boost?</h2>
        <p className="text-slate-500 text-lg">Top-up coins never expire.</p>
        
        {!isOnPaid && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 shadow-sm"
          >
            <span className="text-xl">⚠️</span>
            <p className="font-medium">Top-ups are only available on paid plans. Upgrade above to unlock.</p>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {packs.map((pack, idx) => {
          const isPopular = idx === 1; // Medium
          const price = currency === 'INR' ? pack.price_inr : pack.price_usd;
          const symbol = currency === 'INR' ? '₹' : '$';
          const workflows = Math.floor(pack.coins / 89);
          const highlightThis = isPopular && highlightPopular;
          
          return (
            <motion.div
              key={pack.pack_id}
              id={isPopular ? 'popular-topup-pack' : undefined}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-white rounded-[2rem] p-8 flex flex-col items-center text-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 group
                ${highlightThis
                  ? 'border-2 border-violet-600 shadow-[0_0_30px_rgba(124,58,237,0.55)] ring-4 ring-violet-500/35 scale-[1.03] z-10'
                  : isPopular 
                    ? 'border-2 border-violet-600 shadow-xl shadow-violet-100' 
                    : 'border border-slate-200 shadow-sm hover:border-violet-200'}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-5 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg z-10">
                  Popular
                </div>
              )}
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">{pack.display_name}</h3>
              
              <div className="mb-4">
                <span className="text-5xl font-black text-slate-900">{symbol}{price}</span>
              </div>
              
              <div className="space-y-1 mb-10">
                <p className="text-2xl font-black text-violet-600">{pack.coins.toLocaleString()} coins</p>
                <p className="text-sm font-medium text-slate-400">~{workflows} workflows</p>
              </div>

              <button
                disabled={!isOnPaid || !!processing}
                onClick={() => handleTopUp(pack.pack_id)}
                className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all duration-300 cursor-pointer
                  ${!isOnPaid 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isPopular
                      ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200'
                      : 'border-2 border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white'
                  }`}
              >
                {processing === pack.pack_id ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : 'Buy Now'}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="pt-8 space-y-6">
        <h3 className="text-xl font-bold text-slate-900">What each coin pays for</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-6">
          {TOP_UP_OPERATIONS.map((op) => (
            <div key={op.name} className="flex items-center justify-between group">
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{op.name}</span>
              <div className="flex-1 mx-4 border-b border-dotted border-slate-300 group-hover:border-slate-400 transition-colors" />
              <span className="text-sm font-bold text-slate-900">{op.cost} coins</span>
            </div>
          ))}
        </div>
        
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="mt-8 p-5 rounded-2xl border-2 border-violet-600 bg-violet-50/50 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-600" />
            <span className="font-bold text-lg text-violet-700">Full Workflow</span>
          </div>
          <span className="font-black text-xl text-violet-700 underline decoration-violet-300 underline-offset-4">89 coins</span>
        </motion.div>
      </div>
    </div>
  )
}
