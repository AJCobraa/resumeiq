import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 24, duration: 0.8 },
  },
}

export default function HeroSection({ handleGetStarted }) {
  return (
    <section className="flex-grow relative flex items-center justify-center pt-[120px] pb-32 overflow-hidden bg-background">
      {/* Atmospheric AI Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-dark/10 rounded-full blur-[80px] pointer-events-none -z-10" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-6 w-full flex flex-col items-center text-center z-10"
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border/60 text-primary text-sm font-medium shadow-soft"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Trusted by 10,000+ job seekers
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground max-w-4xl mb-6 tracking-tighter leading-[1.05]"
        >
          Land your dream job with{' '}
          <span className="text-primary relative inline-block">
            AI-powered
            <svg
              className="absolute -bottom-2 left-0 w-full h-3 text-primary/30"
              fill="currentColor"
              preserveAspectRatio="none"
              viewBox="0 0 100 10"
            >
              <path
                d="M0,5 Q50,10 100,5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
          </span>{' '}
          resumes
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
        >
          ResumeIQ uses semantic AI to optimize your resume for any job posting, helping you beat ATS systems and stand out to top recruiters immediately.
        </motion.p>

        {/* CTA Group */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-auto inline-flex items-center justify-center bg-gradient-to-r from-primary to-brand-dark text-primary-foreground rounded-2xl px-8 py-4 text-base font-bold hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300"
          >
            Get Started Free
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <button className="w-full sm:w-auto inline-flex items-center justify-center bg-card border border-border/60 text-foreground rounded-2xl px-8 py-4 text-base font-bold hover:bg-surface-hover hover:border-primary/30 shadow-soft transition-all duration-200">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch Demo
          </button>
        </motion.div>

        {/* Interactive Storyboard Animation */}
        <motion.div
          variants={itemVariants}
          className="mt-20 w-full max-w-5xl relative rounded-3xl border border-border/60 shadow-[0_20px_40px_rgba(31,16,142,0.08)] overflow-hidden bg-card/80 h-[380px] flex items-center justify-center p-8 backdrop-blur-md"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50 pointer-events-none z-30" />
          
          <div className="relative w-full max-w-3xl h-full flex items-center justify-between z-20">
            {/* Step 1: Base Resume */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-44 bg-card border-[3px] border-slate-800 dark:border-slate-300 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-2 relative">
                <div className="w-1/2 h-2.5 bg-surface-hover rounded-full mb-2" />
                <div className="w-full h-1.5 bg-surface-hover rounded-full" />
                <div className="w-5/6 h-1.5 bg-surface-hover rounded-full" />
                <div className="w-full h-1.5 bg-surface-hover rounded-full" />
                <div className="w-4/5 h-1.5 bg-surface-hover rounded-full mt-2" />
                <div className="w-full h-1.5 bg-surface-hover rounded-full" />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-card border-2 border-slate-800 dark:border-slate-300 shadow-md text-[10px] font-bold px-3 py-1.5 rounded-full text-foreground uppercase whitespace-nowrap">
                  Base Resume
                </div>
              </div>
            </motion.div>

            {/* Connecting Lines / AI Processing */}
            <div className="flex-1 h-full relative flex items-center justify-center">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 1.5, duration: 0.5 }}
                 className="relative z-10 w-16 h-16 bg-primary rounded-2xl shadow-glow flex items-center justify-center"
               >
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
               </motion.div>
               
               {/* Data flowing from left */}
               <motion.div 
                 className="absolute left-0 top-1/2 -translate-y-1/2 w-[calc(50%-2rem)] h-[2px] bg-gradient-to-r from-transparent to-primary/40"
               />
               <motion.div
                 initial={{ left: "0%" }}
                 animate={{ left: "calc(50% - 2rem)" }}
                 transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
                 className="absolute top-1/2 -translate-y-1/2 w-8 h-[2px] bg-primary shadow-[0_0_8px_#1f108e]"
               />
               
               {/* Data flowing from top (Job Post) */}
               <motion.div 
                 className="absolute left-1/2 top-0 -translate-x-1/2 w-[2px] h-[calc(50%-2rem)] bg-gradient-to-b from-transparent to-primary/40"
               />
               <motion.div
                 initial={{ top: "0%" }}
                 animate={{ top: "calc(50% - 2rem)" }}
                 transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
                 className="absolute left-1/2 -translate-x-1/2 w-[2px] h-8 bg-primary shadow-[0_0_8px_#1f108e]"
               />

               {/* Data flowing to right */}
               <motion.div 
                 className="absolute right-0 top-1/2 -translate-y-1/2 w-[calc(50%-2rem)] h-[2px] bg-gradient-to-l from-transparent to-primary/40"
               />
               <motion.div
                 initial={{ left: "calc(50% + 2rem)" }}
                 animate={{ left: "100%" }}
                 transition={{ delay: 2, duration: 2, repeat: Infinity }}
                 className="absolute top-1/2 -translate-y-1/2 w-8 h-[2px] bg-primary shadow-[0_0_8px_#1f108e]"
               />
            </div>

            {/* Target Job */}
            <motion.div 
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="absolute left-1/2 -translate-x-1/2 top-8 flex flex-col items-center"
            >
              <div className="bg-card border-2 border-slate-800 dark:border-slate-300 rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
                <div className="w-6 h-6 bg-[#0a66c2] rounded shadow flex items-center justify-center">
                  <span className="text-[12px] font-bold text-white">in</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-foreground">Target Role</span>
                  <span className="text-[8px] text-muted-foreground uppercase">Job Description</span>
                </div>
              </div>
            </motion.div>

            {/* Step 3: Tailored Resume */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.5, duration: 0.8 }}
              className="flex flex-col items-center relative"
            >
              <div className="w-40 h-56 bg-card border-[3px] border-primary rounded-xl shadow-[0_20px_50px_rgba(31,16,142,0.2)] p-5 flex flex-col gap-2 relative">
                <div className="flex items-center gap-3 mb-2 border-b border-border/60 pb-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                     <span className="text-primary text-[12px] font-bold">R</span>
                  </div>
                  <div className="flex-1 h-2.5 bg-primary/20 rounded-full" />
                </div>
                <div className="w-full h-1.5 bg-primary/10 rounded-full" />
                <div className="w-5/6 h-1.5 bg-primary/10 rounded-full" />
                <div className="w-full h-1.5 bg-primary/10 rounded-full" />
                <div className="w-4/5 h-1.5 bg-primary/10 rounded-full mt-2" />
                <div className="w-full h-1.5 bg-primary/10 rounded-full" />
                
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 3, type: "spring", stiffness: 200 }}
                  className="absolute -top-5 -right-5 bg-emerald-500 text-white text-[12px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 border-2 border-background"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  98% Match
                </motion.div>
                
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-4 py-2 rounded-full shadow-lg uppercase whitespace-nowrap">
                  Tailored Output
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* The Written Story / How we are different */}
        <motion.div 
          variants={itemVariants}
          className="mt-12 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        >
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <span className="font-bold">1</span>
            </div>
            <h3 className="font-bold text-foreground text-lg mb-2">Upload Once</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stop rewriting your resume from scratch. Upload your core experience once to create a secure, master baseline.
            </p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <span className="font-bold">2</span>
            </div>
            <h3 className="font-bold text-foreground text-lg mb-2">Browse Jobs</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Find your dream job on LinkedIn. Our Chrome extension instantly analyzes the specific job requirements right on the page.
            </p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground mb-4 shadow-glow">
              <span className="font-bold">3</span>
            </div>
            <h3 className="font-bold text-foreground text-lg mb-2">1-Click Tailor</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ResumeIQ's AI rewrites your bullets to perfectly match the job description, boosting your ATS score instantly.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
