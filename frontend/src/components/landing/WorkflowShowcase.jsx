import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const steps = [
  { id: 1, title: 'Import Resume', desc: 'Upload your existing document. We support PDF, DOCX, and direct LinkedIn imports.' },
  { id: 2, title: 'Select Theme', desc: 'Choose from our curated library of executive-grade templates.' },
  { id: 3, title: 'Visit Job Board', desc: 'Find your target role. No need to copy text, just navigate to the page.' },
  { id: 4, title: 'Launch Extension', desc: 'Click the ResumeIQ Chrome extension directly on the job posting to begin analysis.' },
  { id: 5, title: 'Deep Analysis', desc: 'Our intelligence engine cross-references your experience against the role\'s specific demands.' },
  { id: 6, title: 'Approve Recommendation', desc: 'Review AI-suggested rewrites, metric enhancements, and structural adjustments.' },
  { id: 7, title: 'Interview Preparation', desc: 'Generate custom interview prep materials based on your newly optimized profile.' },
]

export default function WorkflowShowcase() {
  const [activeStep, setActiveStep] = useState(5)

  return (
    <section className="py-24 px-6 md:px-12 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
            The ResumeIQ Workflow
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            A seamless, AI-driven process designed to elevate your professional narrative with executive precision.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-12 relative">
          {/* Left Column: Steps */}
          <div className="w-full md:w-1/2 flex flex-col relative z-10 space-y-2">
            {steps.map((step, idx) => {
              const isActive = activeStep === step.id
              return (
                <div
                  key={step.id}
                  className={`flex gap-6 group cursor-pointer p-4 -ml-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-card border border-primary/30 shadow-lg scale-[1.02]' : 'border border-transparent hover:bg-surface-hover/50'}`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${isActive ? 'border-primary bg-primary shadow-glow' : 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'}`}>
                      {isActive ? (
                        <motion.div layoutId="active-step" className="w-3 h-3 bg-white rounded-full" />
                      ) : (
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{step.id}</span>
                      )}
                    </div>
                    {idx !== steps.length - 1 && (
                      <div className={`w-[2px] h-full mt-2 transition-colors duration-300 ${isActive ? 'bg-primary/50' : 'bg-slate-200 dark:bg-slate-800'}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <h3 className={`text-xl font-semibold transition-colors ${isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300 group-hover:text-primary/80'}`}>
                      {step.title}
                    </h3>
                    <p className={`text-base mt-2 leading-relaxed ${isActive ? 'text-foreground' : 'text-slate-500 dark:text-slate-400'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Column: Sticky Visuals */}
          <div className="w-full md:w-1/2 relative h-full min-h-[500px]">
            <div className="sticky top-32 w-full">
              {/* Decorative background elements behind card */}
              <div className="absolute -z-10 top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
              <div className="absolute -z-10 bottom-10 -left-10 w-48 h-48 bg-brand-dark/10 rounded-full blur-[60px]" />

              {/* Visual Container */}
              <div className="bg-card/70 backdrop-blur-xl border border-border/60 shadow-[0_20px_40px_rgba(31,16,142,0.06)] rounded-3xl p-8 h-[520px] relative overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  {/* Step 5: Deep Analysis Visual */}
                  {activeStep === 5 && (
                    <motion.div
                      key="step-5"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-8 flex flex-col justify-center"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Analysis Complete</h4>
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          AI Powered
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Score Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                          <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2">ATS Keyword Score</span>
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-border/60" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                              <motion.path 
                                initial={{ strokeDasharray: "0, 100" }} 
                                animate={{ strokeDasharray: "85, 100" }} 
                                transition={{ duration: 1.5, delay: 0.2 }}
                                className="text-primary" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" 
                              />
                            </svg>
                            <span className="absolute text-4xl font-bold text-foreground">85</span>
                          </div>
                        </div>

                        {/* Semantic Match */}
                        <div className="bg-card rounded-2xl p-6 border border-border/40 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                          <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2">Semantic Match</span>
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-border/60" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                              <motion.path 
                                initial={{ strokeDasharray: "0, 100" }} 
                                animate={{ strokeDasharray: "92, 100" }} 
                                transition={{ duration: 1.5, delay: 0.4 }}
                                className="text-emerald-500" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" 
                              />
                            </svg>
                            <span className="absolute text-4xl font-bold text-foreground">92<span className="text-xl">%</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 bg-emerald-50/50 rounded-xl p-5 border border-emerald-100/50">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-muted-foreground font-medium">
                            High probability of progressing past initial screening. Consider strengthening language around <span className="text-emerald-700 font-semibold">"Cross-functional Leadership"</span>.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 6: Approve Recommendation Visual */}
                  {activeStep === 6 && (
                    <motion.div
                      key="step-6"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-8 flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Suggested Revision</h4>
                      </div>

                      <div className="flex-grow flex flex-col gap-4">
                        {/* Original */}
                        <div className="border border-border/40 rounded-xl p-5 bg-background/50 relative mt-2">
                          <span className="absolute -top-3 left-4 bg-card px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider rounded-full border border-border/40">Original</span>
                          <p className="text-sm text-muted-foreground line-through decoration-muted-foreground/40 pt-2">
                            Managed a team of developers to build a new app feature that improved sales.
                          </p>
                        </div>

                        <div className="flex justify-center -my-3 z-10 relative">
                          <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-md border-2 border-card">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </div>
                        </div>

                        {/* AI Suggestion */}
                        <div className="border-2 border-primary/20 rounded-xl p-5 bg-primary/5 relative mt-2">
                          <span className="absolute -top-3 left-4 bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Enhanced
                          </span>
                          <p className="text-sm text-foreground font-medium leading-relaxed pt-2">
                            Spearheaded a 6-person cross-functional engineering team to architect and launch a core mobile feature, driving a <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">24% increase</span> in Q3 enterprise sales.
                          </p>
                        </div>

                        <div className="mt-auto flex gap-3 justify-end pt-4">
                          <button className="px-5 py-2.5 text-sm font-semibold text-muted-foreground border border-border/60 rounded-xl hover:bg-surface-hover transition-colors">
                            Reject
                          </button>
                          <button className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                            Approve
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 1: Import Resume Visual */}
                  {activeStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-8 flex flex-col items-center justify-center"
                    >
                      <div className="w-full max-w-sm bg-card border-2 border-dashed border-primary/40 rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden">
                        <motion.div 
                          animate={{ y: [0, -10, 0] }} 
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6"
                        >
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </motion.div>
                        <h4 className="text-lg font-bold text-foreground mb-2">Upload Resume</h4>
                        <p className="text-sm text-muted-foreground text-center mb-6">Drop your PDF or DOCX here</p>
                        
                        {/* Fake Progress Bar */}
                        <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                        <span className="text-xs text-primary font-medium mt-3">Parsing experience...</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Select Theme Visual */}
                  {activeStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-8 flex flex-col justify-center"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Executive Themes</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <motion.div 
                            key={i}
                            animate={i === 1 ? { borderColor: ['#e2e8f0', '#1f108e', '#e2e8f0'] } : {}}
                            transition={i === 1 ? { repeat: Infinity, duration: 3 } : {}}
                            className={`bg-card border-2 rounded-xl p-4 h-32 flex flex-col gap-2 ${i === 1 ? 'border-primary/50 shadow-sm' : 'border-border/40'}`}
                          >
                            <div className="w-1/2 h-3 bg-surface-hover rounded-full" />
                            <div className="w-3/4 h-2 bg-surface-hover rounded-full" />
                            <div className="w-full h-2 bg-surface-hover rounded-full mt-2" />
                            <div className="w-5/6 h-2 bg-surface-hover rounded-full" />
                            {i === 1 && (
                              <div className="mt-auto flex justify-end">
                                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Visit Job Board Visual */}
                  {activeStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-8 flex flex-col justify-center"
                    >
                      <div className="w-full bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
                        {/* Browser Header */}
                        <div className="bg-surface-hover border-b border-border/40 px-4 py-3 flex items-center gap-2 shrink-0">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-destructive/60" />
                            <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                            <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
                          </div>
                          <div className="bg-background border border-border/40 rounded-md text-[10px] text-muted-foreground px-3 py-1 flex-1 text-center font-mono mx-4">
                            linkedin.com/jobs/view/...
                          </div>
                        </div>
                        {/* Browser Body with Scroll Animation */}
                        <div className="flex-1 relative overflow-hidden bg-surface-hover/30">
                          <motion.div 
                            animate={{ y: [0, -120, -120, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.8, 1] }}
                            className="p-6 space-y-4"
                          >
                            <div className="bg-background p-4 rounded-xl border border-border/40 shadow-sm relative overflow-hidden">
                                <motion.div 
                                  animate={{ opacity: [0, 1, 1, 0] }}
                                  transition={{ duration: 6, repeat: Infinity, times: [0, 0.3, 0.8, 1] }}
                                  className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-xl"
                                />
                                <h4 className="font-bold text-foreground mb-1 relative z-10">Senior Software Engineer</h4>
                                <p className="text-xs text-muted-foreground relative z-10">TechNova Inc. • San Francisco, CA</p>
                            </div>
                            <div className="bg-background p-4 rounded-xl border border-border/40 shadow-sm opacity-60">
                                <h4 className="font-bold text-foreground mb-1">Full Stack Developer</h4>
                                <p className="text-xs text-muted-foreground">Global Systems • Remote</p>
                            </div>
                            <div className="bg-background p-4 rounded-xl border border-border/40 shadow-sm opacity-60">
                                <h4 className="font-bold text-foreground mb-1">Frontend Architect</h4>
                                <p className="text-xs text-muted-foreground">StartupX • New York, NY</p>
                            </div>
                          </motion.div>
                          {/* Animated Cursor */}
                          <motion.div 
                            animate={{ x: [200, 200, 150, 200], y: [250, 100, 100, 250], scale: [1, 1, 0.9, 1] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", times: [0, 0.3, 0.4, 1] }}
                            className="absolute z-20 pointer-events-none top-0 left-0"
                          >
                            <svg className="w-6 h-6 text-foreground drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M13.64 21.97l-3.23-7.58L5 19.34V2.78l15.34 11.19-5.74 1.34 3.23 7.58-4.19 1.88z" />
                            </svg>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Launch Extension Visual */}
                  {activeStep === 4 && (
                    <motion.div
                      key="step-4"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-8 flex flex-col justify-center"
                    >
                      <div className="w-full bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col relative">
                        {/* Browser Top Bar with Extension Icon */}
                        <div className="bg-surface-hover border-b border-border/40 px-4 py-3 flex items-center justify-between shrink-0">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-destructive/60" />
                            <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                            <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
                          </div>
                          {/* Extension Icon */}
                          <motion.div 
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            className="w-6 h-6 bg-primary rounded flex items-center justify-center relative z-20 shadow-[0_0_10px_rgba(31,16,142,0.5)]"
                          >
                            <span className="text-white text-[10px] font-bold">R</span>
                          </motion.div>
                        </div>
                        {/* Fake Page Body */}
                        <div className="p-6 opacity-30 flex-1 bg-background">
                          <div className="h-4 w-1/3 bg-foreground rounded mb-4" />
                          <div className="h-2 w-full bg-foreground rounded mb-2" />
                          <div className="h-2 w-5/6 bg-foreground rounded" />
                        </div>
                        
                        {/* Extension Popup */}
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: [0, 1, 1, 1], y: [-10, 0, 0, 0] }}
                          transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 0.9, 1] }}
                          className="absolute top-12 right-4 w-56 bg-background border border-border/60 shadow-2xl rounded-xl p-4 z-10 flex flex-col items-center"
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                            <span className="text-primary font-bold">R</span>
                          </div>
                          <h5 className="text-sm font-bold text-foreground mb-1">ResumeIQ</h5>
                          <p className="text-[10px] text-muted-foreground mb-4 text-center">Job detected. Ready to analyze.</p>
                          
                          {/* Deep Analysis Button in Extension */}
                          <motion.button 
                            animate={{ scale: [1, 1, 0.95, 1], backgroundColor: ["#1f108e", "#1f108e", "#3730a3", "#1f108e"] }}
                            transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.45, 0.5] }}
                            className="w-full bg-primary text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Deep Analysis
                          </motion.button>
                        </motion.div>

                        {/* Animated Cursor */}
                        <motion.div 
                          animate={{ x: [50, 300, 300, 150], y: [200, 10, 110, 200], scale: [1, 0.9, 0.9, 1] }}
                          transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 0.45, 1] }}
                          className="absolute z-30 pointer-events-none top-0 left-0"
                        >
                          <svg className="w-6 h-6 text-foreground drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13.64 21.97l-3.23-7.58L5 19.34V2.78l15.34 11.19-5.74 1.34 3.23 7.58-4.19 1.88z" />
                          </svg>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 7: Interview Preparation Visual */}
                  {activeStep === 7 && (
                    <motion.div
                      key="step-7"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-8 flex flex-col justify-center"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">AI Interview Coach</h4>
                      </div>
                      
                      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm mb-4">
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded uppercase mb-3 inline-block">Behavioral</span>
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                          "Tell me about a time you led a cross-functional team through a difficult technical pivot."
                        </p>
                      </div>
                      
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3 flex items-center justify-center gap-2 shadow-glow"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate STAR Answer
                      </motion.button>
                      
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="mt-4 bg-surface-hover border border-border/40 rounded-xl p-4"
                      >
                        <div className="flex gap-2 items-center mb-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">S</span>
                          <div className="h-1.5 bg-border/60 rounded-full w-full" />
                        </div>
                        <div className="flex gap-2 items-center mb-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">T</span>
                          <div className="h-1.5 bg-border/60 rounded-full w-3/4" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">A</span>
                          <div className="h-1.5 bg-border/60 rounded-full w-5/6" />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
