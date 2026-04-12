import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'

function StatCard({ label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue: 'text-accent-blue',
    green: 'text-green',
    purple: 'text-purple-400',
    orange: 'text-orange',
  }
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color] || 'text-text-primary'}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </Card>
  )
}

const OPERATION_LABELS = {
  score_ats: 'ATS Scoring',
  generate_recs: 'Recommendation Gen',
  rewrite_bullet: 'Bullet Rewrite',
  parse_resume_pdf: 'PDF Parsing',
  embed_resume: 'Resume Embedding',
  embed_jd: 'JD Embedding',
}

export default function Admin() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getAdminStats()
        setStats(data)
      } catch {
        toast.error('Failed to load admin stats')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <p className="text-text-muted">No stats available yet. Run some analyses first.</p>
      </div>
    )
  }

  const breakdown = stats.breakdown || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8 max-w-6xl"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Model Monitoring</h1>
        <p className="text-text-muted mt-1">AI token usage, latency, and cache hit tracking</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total AI Calls"
          value={stats.totalCalls.toLocaleString()}
          color="blue"
        />
        <StatCard
          label="Input Tokens"
          value={(stats.totalInputTokens / 1000).toFixed(1) + 'k'}
          sub="Total sent to models"
          color="purple"
        />
        <StatCard
          label="Output Tokens"
          value={(stats.totalOutputTokens / 1000).toFixed(1) + 'k'}
          sub="Total generated"
          color="orange"
        />
        <StatCard
          label="JD Cache Rate"
          value={`${stats.cacheHitRate}%`}
          sub="Embedding cache hits"
          color="green"
        />
      </div>

      {/* Avg Latency */}
      <Card className="mb-8 flex items-center gap-6 p-5">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide font-medium mb-1">Avg Latency</p>
          <p className="text-2xl font-bold">{stats.avgLatencyMs.toLocaleString()} ms</p>
        </div>
        <div className="w-px h-10 bg-border-default" />
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide font-medium mb-1">Models Used</p>
          <p className="text-sm text-text-primary"> gemma-4-31b-it · gemini-embedding-001 </p>
        </div>
      </Card>

      {/* Operation Breakdown */}
      <Card className="mb-12">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#64748B] mb-6 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4F8EF7]" />
          Model Breakdown <span className="text-[10px] opacity-50 font-normal">(Last 50 calls)</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left">
                <th className="pb-3 text-text-muted font-medium pr-4">Operation</th>
                <th className="pb-3 text-text-muted font-medium text-right pr-4">Calls</th>
                <th className="pb-3 text-text-muted font-medium text-right pr-4">Input Tokens</th>
                <th className="pb-3 text-text-muted font-medium text-right pr-4">Output Tokens</th>
                <th className="pb-3 text-text-muted font-medium text-right">Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(breakdown).map(([op, data]) => (
                <tr key={op} className="border-b border-border-default/50 last:border-0">
                  <td className="py-3 pr-4">
                    <span className="font-medium text-text-primary">
                      {OPERATION_LABELS[op] || op}
                    </span>
                    <span className="ml-2 text-xs text-text-muted font-mono"> {data.model} </span>
                  </td>
                  <td className="py-3 pr-4 text-right"> {data.calls.toLocaleString()} </td>
                  <td className="py-3 pr-4 text-right text-accent-blue"> {data.inputTokens.toLocaleString()} </td>
                  <td className="py-3 pr-4 text-right text-purple-400"> {data.outputTokens.toLocaleString()} </td>
                  <td className="py-3 text-right text-text-muted"> {data.avgLatencyMs} ms </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Logs */}
      <Card>
        <h2 className="text-base font-semibold mb-4">Recent Model Calls</h2>
        {stats.recentLogs.length === 0 ? (
          <p className="text-sm text-text-muted">No recent logs.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentLogs.map((log) => (
              <div
                key={log.logId}
                className="flex items-center justify-between p-3 rounded-[6px] bg-bg-elevated text-sm"
              >
                <div className="flex items-center gap-3">
                  {log.isCacheHit && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green/10 text-green font-medium">CACHE</span>
                  )}
                  <span className="font-medium">{OPERATION_LABELS[log.operation] || log.operation}</span>
                  <span className="text-text-muted text-xs font-mono">{log.model}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="text-accent-blue">↑ {(log.inputTokens || 0).toLocaleString()}</span>
                  <span className="text-purple-400">↓ {(log.outputTokens || 0).toLocaleString()}</span>
                  <span>{log.latencyMs?.toFixed(0)} ms</span>
                  <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
