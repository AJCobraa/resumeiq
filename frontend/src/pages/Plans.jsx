import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import PlanCard from '../components/billing/PlanCard'
import TopUpSection from '../components/billing/TopUpSection'
import FaqSection from '../components/billing/FaqSection'
import { Stat, BillingToggle, CurrencyToggle, PaymentHistory, CancelModal } from '../components/billing/BillingComponents'

const PLAN_ACCENTS = {
  free: 'text-slate-600',
  starter: 'text-blue-600',
  pro: 'text-purple-600',
  growth: 'text-amber-600',
}

async function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-sdk')) return resolve(true)
    const s = document.createElement('script')
    s.id = 'razorpay-sdk'
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function Plans() {
  const [searchParams] = useSearchParams()
  const highlightPopular = searchParams.get('highlight') === 'popular'
  const [catalog, setCatalog] = useState(null)
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState('monthly')
  const [currency, setCurrency] = useState('INR')
  const [processing, setProcessing] = useState(null)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (highlightPopular && !loading && catalog) {
      const timer = setTimeout(() => {
        const element = document.getElementById('popular-topup-pack');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightPopular, loading, catalog]);

  const fetchData = useCallback(async () => {
    try {
      const [cat, bill] = await Promise.all([api.getBillingCatalog(), api.getBillingStatus()])
      setCatalog(cat); setBilling(bill)
    } catch { toast.error('Failed to load billing data') }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  async function openCheckout(orderData, onSuccess) {
    const ok = await loadRazorpayScript()
    if (!ok || !window.Razorpay) return toast.error('Razorpay not loaded')
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!razorpayKey) return toast.error('Razorpay key missing')

    const options = {
      key: razorpayKey, amount: orderData.amount, currency: orderData.currency,
      order_id: orderData.orderId, name: 'ResumeIQ',
      description: orderData.planId ? `${orderData.planId} – ${orderData.billingCycle}` : `Top-up: ${orderData.packId}`,
      handler: async (res) => {
        try {
          await api.verifyPayment({ razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature })
          toast.success('Payment successful!'); onSuccess?.(); await fetchData()
        } catch { toast.error('Payment verification failed') }
        finally { setProcessing(null) }
      },
      modal: { ondismiss: () => setProcessing(null) },
      theme: { color: '#6366f1' }, prefill: { email: billing?.email || '' },
    }
    new window.Razorpay(options).open()
  }

  async function handleSubscribe(planId) {
    if (processing) return; setProcessing(planId)
    try { const order = await api.createSubscriptionOrder(planId, cycle, currency); await openCheckout(order) }
    catch (err) { toast.error(err.message || 'Order failed'); setProcessing(null) }
  }

  async function handleTopUp(packId) {
    if (processing) return; setProcessing(packId)
    try { const order = await api.createTopUpOrder(packId, currency); await openCheckout(order) }
    catch (err) { toast.error(err.message || 'Order failed'); setProcessing(null) }
  }

  async function handleCancel() {
    setCancelling(true)
    try { await api.cancelSubscription('User requested'); toast.success('Cancelled'); setCancelModal(false); await fetchData() }
    catch (err) { toast.error(err.message || 'Failed') }
    finally { setCancelling(false) }
  }

  if (loading) return <div className="p-8 max-w-6xl mx-auto animate-pulse text-text-muted">Loading billing details...</div>

  const currentPlan = billing?.plan_id || 'free'
  const isOnPaid = currentPlan !== 'free'

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10" id="plans-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Plans & Billing</h1>
        <p className="text-text-muted mt-1">Manage your subscription and top up coins.</p>
        
        {/* Temporary Toast Test Panel */}
        <div className="mt-4 p-4 bg-slate-100 dark:bg-zinc-800 rounded-xl flex gap-3 flex-wrap items-center border border-slate-200 dark:border-zinc-700/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Toasts:</span>
          <button 
            id="test-toast-success"
            onClick={() => toast.success('Success! Your billing changes have been premium-redesigned.')}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Trigger Success
          </button>
          <button 
            id="test-toast-error"
            onClick={() => toast.error('Error! The backend was unable to verify the transaction details.')}
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Trigger Error
          </button>
          <button 
            id="test-toast-warning"
            onClick={() => toast.warning('Warning! You only have 3 analysis coins left on your starter package.')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Trigger Warning
          </button>
          <button 
            id="test-toast-info"
            onClick={() => toast.info('Info: A new coin package promotion is active this week.')}
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Trigger Info
          </button>
        </div>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-bg-card border border-border-default rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs text-text-muted uppercase tracking-wider mb-1">Current Plan</p><p className={`text-xl font-bold ${PLAN_ACCENTS[currentPlan] || 'text-accent-blue'}`}>{billing?.plan_name || 'Free'}</p></div>
        <div className="flex gap-8">
          <Stat label="Subscription Coins" value={billing?.coins_balance} />
          <Stat label="Top-up Coins" value={billing?.topup_coins_balance} color="text-green" />
          <Stat label="Total Balance" value={billing?.total_coins} />
        </div>
        {billing?.period_end && <div className="text-right"><p className="text-xs text-text-muted">Period ends</p><p className="text-sm font-medium">{new Date(billing.period_end).toLocaleDateString()}</p></div>}
      </motion.div>

      <div className="text-center space-y-3">
        <h2 className="text-4xl font-black tracking-tight text-slate-900">Choose your plan</h2>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
          Commit longer to earn bonus coins. Each coin powers your ATS analysis and AI rewrites.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <BillingToggle cycle={cycle} setCycle={setCycle} />
        <CurrencyToggle currency={currency} setCurrency={setCurrency} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {catalog?.plans?.map((plan, idx) => (
          <PlanCard key={plan.plan_id} plan={plan} idx={idx} currentPlan={currentPlan} cycle={cycle} currency={currency} processing={processing} handleSubscribe={handleSubscribe} setCancelModal={setCancelModal} billing={billing} isOnPaid={isOnPaid} />
        ))}
      </div>

      <TopUpSection packs={catalog?.packs || []} currency={currency} isOnPaid={isOnPaid} processing={processing} handleTopUp={handleTopUp} highlightPopular={highlightPopular} />
      
      <FaqSection />

      {billing?.payment_history?.length > 0 && <PaymentHistory history={billing.payment_history} />}

      <CancelModal show={cancelModal} cancelling={cancelling} periodEnd={billing?.period_end} onCancel={handleCancel} onClose={() => setCancelModal(false)} />
    </div>
  )
}
