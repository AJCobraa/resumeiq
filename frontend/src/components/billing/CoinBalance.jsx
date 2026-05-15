import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export default function CoinBalance() {
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
        <div className="h-10 rounded-lg bg-bg-elevated animate-pulse" />
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

  return (
    <button
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
