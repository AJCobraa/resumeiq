import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function DeepDiveFeatures() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-8 z-10 relative">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-card border border-border/60 shadow-soft px-3.5 py-1.5 rounded-full mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Base Profile</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
                One Base Resume.<br/>
                <span className="text-primary">Unlimited Variations.</span>
              </h2>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Upload your resume once. Our system securely saves it as your base profile. From there, instantly generate perfectly tailored versions for any job application, while keeping your original safely untouched.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/" className="bg-primary text-primary-foreground px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-all shadow-glow hover:-translate-y-0.5 flex items-center space-x-2">
                <span>Get Started Now</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* Visuals & Animations */}
          <div className="lg:col-span-7 relative min-h-[500px] flex items-center justify-center mt-12 lg:mt-0">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/5 to-surface-hover rounded-3xl -z-20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[80px] -z-10" />
            
            {/* Main Animation Area */}
            <div className="relative w-full max-w-2xl h-[400px] flex items-center">
              
              {/* Base Resume Center */}
              <motion.div 
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-8 w-48 h-64 bg-card border-2 border-primary/30 shadow-[0_0_40px_rgba(31,16,142,0.15)] rounded-xl p-4 flex flex-col z-20"
              >
                <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-2">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <span className="text-xs font-bold text-foreground">Base Resume</span>
                </div>
                <div className="w-1/2 h-2 bg-surface-hover rounded-full mb-2" />
                <div className="w-3/4 h-2 bg-surface-hover rounded-full mb-4" />
                <div className="w-full h-2 bg-surface-hover rounded-full mb-2" />
                <div className="w-5/6 h-2 bg-surface-hover rounded-full mb-2" />
                <div className="w-full h-2 bg-surface-hover rounded-full mb-2" />
                <div className="w-4/5 h-2 bg-surface-hover rounded-full mb-4" />
                
                <div className="mt-auto self-center text-[10px] text-muted-foreground font-medium bg-surface-hover px-2 py-1 rounded-full">
                  Original Data Secure
                </div>
              </motion.div>

              {/* Connecting Lines */}
              <div className="absolute left-56 top-1/2 w-48 h-[2px] bg-gradient-to-r from-primary/50 to-transparent -translate-y-1/2 z-10 hidden md:block">
                <motion.div 
                  initial={{ left: "0%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 -translate-y-1/2 w-16 h-[2px] bg-primary shadow-[0_0_10px_rgba(31,16,142,0.8)]"
                />
              </div>

              {/* Connecting Path Top */}
              <div className="absolute left-[16rem] top-1/4 w-32 h-[2px] bg-gradient-to-r from-transparent to-primary/30 z-10 hidden md:block transform rotate-[-15deg] origin-left" />
              {/* Connecting Path Bottom */}
              <div className="absolute left-[16rem] bottom-1/4 w-32 h-[2px] bg-gradient-to-r from-transparent to-primary/30 z-10 hidden md:block transform rotate-[15deg] origin-left" />

              {/* Tailored Output 1 */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute right-4 top-4 bg-card/90 backdrop-blur-md rounded-xl p-4 w-56 border border-primary/20 shadow-lg z-20 hidden md:block hover:scale-105 transition-transform"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">Frontend Engineer CV</h4>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-1.5 bg-emerald-500/20 rounded-full" />
                    <div className="w-4/5 h-1.5 bg-surface-hover rounded-full" />
                  </div>
                </div>
              </motion.div>

              {/* Tailored Output 2 */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur-md rounded-xl p-4 w-56 border border-primary/20 shadow-lg z-20 hidden md:block hover:scale-105 transition-transform"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">Backend Engineer CV</h4>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-1.5 bg-blue-500/20 rounded-full" />
                    <div className="w-5/6 h-1.5 bg-surface-hover rounded-full" />
                  </div>
                </div>
              </motion.div>

              {/* Tailored Output 3 */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute right-4 bottom-4 bg-card/90 backdrop-blur-md rounded-xl p-4 w-56 border border-primary/20 shadow-lg z-20 hidden md:block hover:scale-105 transition-transform"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">Machine Learning CV</h4>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-1.5 bg-amber-500/20 rounded-full" />
                    <div className="w-3/4 h-1.5 bg-surface-hover rounded-full" />
                  </div>
                </div>
              </motion.div>
              
            </div>
          </div>
        </div>
      </div>
      
      {/* Feature Highlights Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-24 pt-20 border-t border-border/40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card rounded-2xl p-8 border border-border/40 shadow-soft hover:shadow-[0_10px_30px_rgba(55,48,163,0.05)] hover:border-primary/30 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Targeted Copies</h3>
            <p className="text-muted-foreground leading-relaxed">Create tailored versions of your resume for specific industries or roles without ever altering your original data.</p>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border/40 shadow-soft hover:shadow-[0_10px_30px_rgba(55,48,163,0.05)] hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-6 shadow-glow">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI Narrative Sync</h3>
              <p className="text-muted-foreground leading-relaxed">When you update your base resume, our AI intelligently syncs those new experiences across your active tailored versions.</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border/40 shadow-soft hover:shadow-[0_10px_30px_rgba(55,48,163,0.05)] hover:border-primary/30 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Version History</h3>
            <p className="text-muted-foreground leading-relaxed">Never lose a brilliant bullet point. Access a complete archive of every version of every resume you've ever generated.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
