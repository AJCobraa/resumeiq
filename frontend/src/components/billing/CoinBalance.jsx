import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

export default function CoinBalance({ isCollapsed }) {
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    api.getBillingStatus()
      .then((data) => {
        if (!cancelled) setBalance(data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading || !balance) {
    return (
      <div className="px-3 py-2 mb-1">
        <div className={cn(
          "h-10 rounded-lg bg-bg-elevated animate-pulse",
          isCollapsed && "h-10 w-10 mx-auto"
        )} />
      </div>
    )
  }

  const total = balance.total_coins
  const pct = balance.coins_per_period > 0
    ? Math.min(100, Math.round((total / balance.coins_per_period) * 100))
    : 0

  const barColor = pct > 50
    ? 'bg-green'
    : pct > 20
      ? 'bg-yellow-400'
      : 'bg-red'

  if (isCollapsed) {
    return (
      <button className="cursor-pointer"
        onClick={() => navigate('/plans')}
        className="w-full flex justify-center py-4 group cursor-pointer"
        title={`${total.toLocaleString()} Coins - ${balance.plan_name} plan`}
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue group-hover:bg-accent-blue/20 transition-all duration-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className={cn(
            "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-bg-card",
            barColor
          )} />
        </div>
      </button>
    )
  }

  return (
    <button className="cursor-pointer"
      onClick={() => navigate('/plans')}
      className="w-full px-3 py-2 mb-1 group cursor-pointer"
      id="sidebar-coin-balance"
    >
      <div className="rounded-lg bg-bg-elevated/60 border border-border-default px-3 py-2.5 transition-all duration-200 group-hover:border-accent-blue/40 group-hover:bg-bg-elevated">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted font-medium">Coins</span>
          <span className="text-xs font-bold text-accent-blue">
            {total.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-base overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-text-muted mt-1 text-right">
          {balance.plan_name} plan
        </p>
      </div>
    </button>
  )
}
