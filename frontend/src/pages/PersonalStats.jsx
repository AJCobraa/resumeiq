import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { motion } from 'framer-motion'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import { Coins, FileText, ClipboardList, Bot, Brain, Sparkles, Lightbulb, Edit3, PlusCircle } from 'lucide-react'

function TransactionLog() {
  const toast = useToast()
  const [transactions, setTransactions] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const limit = 5

  const fetchTransactions = useCallback(async (currentOffset, append = false) => {
    try {
      setLoading(true)
      const data = await api.getTransactions(limit, currentOffset)
      if (data.length < limit) {
        setHasMore(false)
      }
      setTransactions(prev => append ? [...prev, ...data] : data)
    } catch {
      toast.error('Failed to load transaction history')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTransactions(0, false)
  }, [fetchTransactions])

  const handleViewMore = () => {
    const nextOffset = offset + limit
    setOffset(nextOffset)
    fetchTransactions(nextOffset, true)
  }

  const getIcon = (op) => {
    switch(op) {
      case 'analyze_and_recommend': return <Lightbulb className="w-5 h-5 text-indigo-500" />
      case 'rewrite_bullet': return <Edit3 className="w-5 h-5 text-indigo-500" />
      case 'topup': 
      case 'subscription_new':
      case 'subscription_renewal': return <PlusCircle className="w-5 h-5 text-indigo-500" />
      default: return <Bot className="w-5 h-5 text-indigo-500" />
    }
  }

  const getTitle = (op) => {
    switch(op) {
      case 'analyze_and_recommend': return 'Deep AI Analysis'
      case 'rewrite_bullet': return 'Tailored Rewrite'
      case 'generate_interview_prep': return 'Interview Prep'
      case 'parse_resume_pdf': return 'Parse Resume'
      case 'embed_resume': return 'Embed Resume'
      case 'embed_jd': return 'Embed Job'
      case 'embed_jd_sentences': return 'Embed Job Sentences'
      case 'topup': return 'Coin Topup'
      case 'subscription_new': return 'New Subscription'
      case 'subscription_renewal': return 'Subscription Renewal'
      default: return op.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0 && now.getDate() === date.getDate()) {
      return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
    } else if (days === 1 || (days === 0 && now.getDate() !== date.getDate())) {
      return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
    } else {
      return date.toLocaleDateString([], {month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined})
    }
  }

  return (
    <Card className="lg:col-span-1 border-slate-200/60 shadow-soft h-[500px] flex flex-col p-6 rounded-[24px]">
      <h3 className="text-lg font-bold text-slate-900 mb-6">Transaction Log</h3>
      
      <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between pb-5 border-b border-slate-100 last:border-0 last:pb-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f4f3ff] shrink-0">
                {getIcon(tx.operation)}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{getTitle(tx.operation)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatRelativeTime(tx.created_at)}</p>
              </div>
            </div>
            
            <div className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
            </div>
          </div>
        ))}
        {transactions.length === 0 && !loading && (
           <p className="text-sm text-slate-500 text-center py-10">No transactions yet.</p>
        )}
      </div>
      
      {hasMore && (
        <button 
          onClick={handleViewMore}
          disabled={loading}
          className="cursor-pointer mt-6 pt-4 border-t border-slate-100 text-sm font-semibold text-indigo-500 hover:text-indigo-600 transition-colors w-full text-center disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'View All History'}
        </button>
      )}
    </Card>
  )
}

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
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center bg-[#fcfcfd]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8 bg-[#fcfcfd]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Stats & ROI</h1>
          <p className="text-slate-500 mt-1.5">Personal usage and system performance metrics</p>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
          {[
            { label: 'Coins Balance', value: stats.coinsBalance, icon: <Coins className="w-6 h-6 text-yellow-500" />, color: 'text-slate-900' },
            { label: 'Resumes', value: stats.totalResumes, icon: <FileText className="w-6 h-6 text-emerald-500" />, color: 'text-slate-900' },
            { label: 'Jobs Analyzed', value: stats.totalJobs, icon: <ClipboardList className="w-6 h-6 text-indigo-500" />, color: 'text-slate-900' },
            { label: 'Total AI Calls', value: stats.totalAiCalls, icon: <Bot className="w-6 h-6 text-blue-500" />, color: 'text-slate-900' },
            { label: 'Models Used', value: stats.modelsUsed.split('·').length, icon: <Brain className="w-6 h-6 text-purple-500" />, color: 'text-slate-900' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="hover:shadow-glow transition-shadow duration-300 h-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100/50">
                    {stat.icon}
                  </div>
                  <div>
                    <p className={`text-2xl font-bold font-mono tracking-tight ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* AI Telemetry Summary */}
        <h2 className="text-lg font-bold text-slate-900 mb-5 mt-12">AI Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-soft relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Bot className="w-24 h-24 text-purple-600" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Input Tokens</p>
            <span className="text-5xl font-bold text-purple-600 tracking-tighter">
              {(stats.totalInputTokens / 1000).toFixed(1)}k
            </span>
            <p className="text-slate-500 text-sm mt-3 font-medium">Scale of data sent to models</p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-soft relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Sparkles className="w-24 h-24 text-amber-500" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Output Tokens</p>
            <span className="text-5xl font-bold text-amber-500 tracking-tighter">
              {(stats.totalOutputTokens / 1000).toFixed(1)}k
            </span>
            <p className="text-slate-500 text-sm mt-3 font-medium">Scale of content generated</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Transaction Log Card */}
          <TransactionLog />

          {/* Operation Breakdown Table */}
          <Card className="lg:col-span-2 overflow-hidden p-0 flex flex-col border-slate-200/60 shadow-soft">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Operation Breakdown</h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operation</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Calls</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">In/Out Tok</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {stats.operationBreakdown
                    .filter(op => !op.operation.startsWith('course_enrollment'))
                    .map((op, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 capitalize group-hover:text-indigo-600 transition-colors">
                            {op.operation.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{op.model}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-slate-500">{op.calls}</td>
                      <td className="px-6 py-4 text-right">
                         <span className="font-mono font-semibold text-indigo-600">{Math.round(op.inputTokens/1000)}k</span>
                         <span className="mx-1 text-slate-300">/</span>
                         <span className="font-mono font-semibold text-purple-500">{Math.round(op.outputTokens/1000)}k</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-medium text-slate-500">{op.avgLatency}ms</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
