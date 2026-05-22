import { motion } from 'framer-motion'

export default function CoinSystemExplanation() {
  return (
    <section className="py-24 bg-surface-hover border-t border-border/40">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1.5 rounded-full bg-card border border-border/60 text-primary text-xs font-bold tracking-widest uppercase mb-4 shadow-soft">
            Tokens & Usage
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
            Precision Powered by <span className="text-primary">IQ Credits</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Access enterprise-grade AI analysis, tailored rewrites, and competitive intelligence without a rigid subscription. Pay only for the computational power you need to advance your career.
          </p>
        </div>

        {/* Bento Grid System */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: The Token */}
          <div className="lg:col-span-5 flex justify-center items-center relative h-full min-h-[400px]">
            {/* Atmospheric glow behind the coin */}
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-[100px] w-3/4 h-3/4 mx-auto my-auto -z-10" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, type: "spring" }}
              className="w-full max-w-[360px] aspect-square relative rounded-full p-8 bg-card/60 backdrop-blur-md flex items-center justify-center border border-primary/20 shadow-[0_20px_40px_rgba(55,48,163,0.08)]"
            >
              {/* Inner glow ring */}
              <div className="absolute inset-2 rounded-full border border-primary/10 shadow-[inset_0_0_20px_rgba(55,48,163,0.05)]" />
              
              {/* Token representation */}
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-brand-dark shadow-[0_10px_30px_rgba(31,16,142,0.3)] flex items-center justify-center relative overflow-hidden border-4 border-white/10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rotate-45" />
                <span className="text-7xl font-bold text-white drop-shadow-md font-display tracking-tighter">IQ</span>
              </div>
            </motion.div>
          </div>
          
          {/* Right Column: Dashboard & Usage */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Balance Card (Full Width in this col) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 bg-card rounded-3xl p-8 border border-border/60 shadow-soft"
            >
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Available Balance</h3>
                  <p className="text-muted-foreground">Your current IQ Credit reservoir.</p>
                </div>
                <div className="text-right flex items-baseline">
                  <span className="text-5xl font-bold text-primary leading-none">85</span>
                  <span className="text-xl font-medium text-muted-foreground ml-1">/100</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-surface-hover rounded-full h-2.5 mb-4 overflow-hidden relative border border-border/40">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "85%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-dark to-primary relative overflow-hidden"
                >
                  <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                </motion.div>
              </div>
              
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Auto-refill enabled
                </span>
                <button className="text-primary hover:text-brand-dark hover:underline transition-colors">Manage Settings</button>
              </div>
            </motion.div>
            
            {/* Usage Breakdown (Left Half) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-3xl p-6 border border-border/60 shadow-soft flex flex-col"
            >
              <h4 className="text-lg font-bold text-foreground mb-5">Transaction Log</h4>
              <div className="space-y-4 flex-grow">
                {/* Log Item 1 */}
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-primary">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Deep AI Analysis</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Today, 10:42 AM</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-md">-2</span>
                </div>
                
                {/* Log Item 2 */}
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-primary">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Tailored Rewrite</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Yesterday</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-md">-1</span>
                </div>
                
                {/* Log Item 3 */}
                <div className="flex justify-between items-center pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Monthly Refill</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Oct 1st</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+100</span>
                </div>
              </div>
              
              <button className="mt-2 w-full py-2.5 text-center text-sm font-semibold text-primary hover:bg-surface-hover rounded-xl transition-colors border border-transparent hover:border-border/60">
                View All History
              </button>
            </motion.div>
            
            {/* Top Up Actions (Right Half) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-3xl p-6 border border-border/60 shadow-soft flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-lg font-bold text-foreground">Need more power?</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Instantly add IQ Credits to your account to unlock advanced rewrite strategies and deeper market comparisons.
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 border border-border/60 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center space-x-3">
                      <input className="w-4 h-4 text-primary bg-background border-border focus:ring-primary focus:ring-offset-background" name="topup" type="radio" />
                      <span className="text-sm font-semibold text-foreground">+25 Credits</span>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">$19</span>
                  </label>
                  
                  <label className="flex items-center justify-between p-3.5 border-2 border-primary rounded-xl bg-primary/5 cursor-pointer relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <div className="flex items-center space-x-3">
                      <input defaultChecked className="w-4 h-4 text-primary bg-background border-border focus:ring-primary focus:ring-offset-background" name="topup" type="radio" />
                      <span className="text-sm font-bold text-primary">+50 Credits</span>
                    </div>
                    <span className="text-sm font-bold text-primary">$35</span>
                  </label>
                </div>
              </div>
              
              <button className="mt-6 w-full py-3.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-glow hover:-translate-y-0.5 transform">
                Purchase Credits
              </button>
            </motion.div>
            
          </div>
        </div>
      </div>
    </section>
  )
}
