import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const FAQS = [
  { q: 'What is a coin?', a: 'A coin is the unit of usage on ResumeIQ. Every AI action — parsing your resume, running an ATS analysis, rewriting a bullet — costs a small number of coins. This keeps pricing transparent: you only pay for what you use.' },
  { q: 'Why do longer plans give more coins?', a: 'Longer commitments help us plan capacity. We pass that savings back to you as bonus coins — 10% more on quarterly, 15% more on 6-month plans.' },
  { q: 'Do unused coins roll over?', a: 'Subscription coins reset at the end of each billing cycle. Top-up coins never expire and roll over indefinitely.' },
  { q: 'Can I downgrade?', a: 'Yes — downgrades take effect at the end of your current billing cycle so you keep what you paid for.' },
  { q: 'Is payment secure?', a: 'All payments are processed via Razorpay using bank-grade encryption. We never see or store your card details.' },
  { q: 'What if I run out of coins?', a: 'You can buy a top-up pack any time, or upgrade your plan. Top-ups are available on all paid plans.' },
]

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Frequently asked</h2>
      <div className="space-y-2">
        {FAQS.map((f, i) => {
          const open = openFaq === i
          return (
            <div key={f.q} className="rounded-xl border border-border-default bg-bg-card overflow-hidden">
              <button className="cursor-pointer"
                onClick={() => setOpenFaq(open ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-bg-elevated/40 transition-colors"
              >
                <span>{f.q}</span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-text-muted text-lg">⌄</motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-5 pb-4 text-sm text-text-muted">{f.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
