import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../lib/utils'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

export default function PersonalStats() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getMyStats()
      setStats(data)
    } catch {
      toast.error('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Stats & ROI</h1>
        <p className="text-text-muted mt-1">Personal usage and system performance metrics</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Avg ATS Boost', value: `+${stats.avgAtsImprovement}%`, icon: '🚀', color: 'text-green' },
          { label: 'Approved Fixes', value: stats.approvedFixes, icon: '✅', color: 'text-accent-blue' },
          { label: 'Jobs Analyzed', value: stats.totalJobs, icon: '📋', color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center text-2xl shadow-inner">
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Telemetry Summary */}
      <h2 className="text-lg font-bold text-[#F1F5F9] mb-4 mt-12">AI Model Usage</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-xl p-6">
          <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">Total AI Calls</p>
          <span className="text-4xl font-bold text-[#4F8EF7]">{stats.totalAiCalls}</span>
        </div>
        
        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-xl p-6">
          <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">Input Tokens</p>
          <span className="text-4xl font-bold text-[#A855F7]">
            {(stats.totalInputTokens / 1000).toFixed(1)}k
          </span>
          <p className="text-[#64748B] text-xs mt-2">Total sent to models</p>
        </div>

        <div className="bg-[#13131A] border border-[#1E1E2E] rounded-xl p-6">
          <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider mb-2">Output Tokens</p>
          <span className="text-4xl font-bold text-[#F59E0B]">
            {(stats.totalOutputTokens / 1000).toFixed(1)}k
          </span>
          <p className="text-[#64748B] text-xs mt-2">Total generated</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Efficiency Card */}
        <Card className="lg:col-span-1 border-border-default/50 hover:border-accent-blue/30 transition-all duration-300">
          <h3 className="text-sm font-semibold mb-6 uppercase tracking-wider text-text-muted">System Efficiency</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-primary">Cache Hit Rate</span>
                <span className="text-sm font-mono text-accent-blue">{stats.cacheHitRate}%</span>
              </div>
              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden shadow-inner">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${stats.cacheHitRate}%` }}
                   transition={{ duration: 1, ease: "easeOut" }}
                   className="h-full bg-gradient-to-r from-accent-blue to-purple-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-text-muted mt-2 leading-relaxed italic">
                Percentage of job descriptions analyzed from cache vs fresh AI computation.
              </p>
            </div>

            <div className="pt-4 border-t border-border-default space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted">Average Latency</span>
                <span className="font-mono text-text-primary">{stats.avgLatencyMs}ms</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted">Models Used</span>
                <span className="text-accent-blue text-right ml-4 max-w-[150px] truncate">{stats.modelsUsed}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Operation Breakdown Table */}
        <Card className="lg:col-span-2 overflow-hidden p-0 flex flex-col border-border-default/50">
          <div className="px-6 py-4 border-b border-border-default bg-bg-elevated/5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Operation Breakdown</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-elevated/30 text-text-muted text-[10px] uppercase font-bold tracking-widest border-b border-border-default">
                <tr>
                  <th className="px-6 py-3 font-semibold">Operation</th>
                  <th className="px-6 py-3 font-semibold text-right">Calls</th>
                  <th className="px-6 py-3 font-semibold text-right">Input Tokens</th>
                  <th className="px-6 py-3 font-semibold text-right">Output Tokens</th>
                  <th className="px-6 py-3 font-semibold text-right">Avg Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {stats.operationBreakdown.map((op, i) => (
                  <tr key={i} className="hover:bg-bg-elevated/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary capitalize group-hover:text-accent-blue transition-colors">
                          {op.operation.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">{op.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-text-muted">{op.calls}</td>
                    <td className="px-6 py-4 text-right font-mono text-accent-blue">{op.inputTokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-purple-400">{op.outputTokens.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-text-muted">{op.avgLatency}ms</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent Model Calls Table */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4 px-2">Recent AI Interactions</h3>
        <Card className="overflow-hidden p-0 border-border-default/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-elevated/30 text-text-muted text-[10px] uppercase font-bold tracking-widest border-b border-border-default">
                <tr>
                  <th className="px-6 py-3 font-semibold">Timestamp</th>
                  <th className="px-6 py-3 font-semibold">Operation</th>
                  <th className="px-6 py-3 font-semibold">Model</th>
                  <th className="px-6 py-3 font-semibold text-center">In/Out Tokens</th>
                  <th className="px-6 py-3 font-semibold text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {stats.recentCalls.map((call, i) => (
                  <tr key={i} className="hover:bg-bg-elevated/20 transition-colors group">
                    <td className="px-6 py-4 text-xs text-text-muted whitespace-nowrap">
                      {formatDate(call.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[10px] capitalize group-hover:border-accent-blue transition-colors">
                        {call.operation.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-text-muted whitespace-nowrap">
                      {call.model}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-mono text-text-muted">
                      <span className="text-text-primary">{call.inputTokens}</span>
                      <span className="mx-1 opacity-30">/</span>
                      <span className="text-accent-blue">{call.outputTokens}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-xs text-accent-blue bg-accent-blue/5 px-2 py-0.5 rounded border border-accent-blue/20">
                        {call.latencyMs}ms
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
