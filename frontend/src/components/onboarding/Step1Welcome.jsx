import { motion } from 'framer-motion'

export default function Step1Welcome() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative px-6">
      {/* Background Glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, duration: 0.8 }}
        className="text-center max-w-4xl"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground text-balance mb-8">
          Your resume.{' '}
          <span className="text-primary">Tailored</span> for every job.{' '}
          Automatically.
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-16"
        >
          ResumeIQ analyses job postings, scores your resume, and rewrites it —
          without touching your master copy.
        </motion.p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.6 }}
            className="flex items-center gap-3 bg-card border border-border/60 px-6 py-4 rounded-2xl shadow-soft"
          >
            <span className="text-2xl">🎯</span>
            <span className="font-semibold text-foreground tracking-tight">3x more interview callbacks</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.8 }}
            className="flex items-center gap-3 bg-card border border-border/60 px-6 py-4 rounded-2xl shadow-soft"
          >
            <span className="text-2xl">⚡</span>
            <span className="font-semibold text-foreground tracking-tight">30 seconds per job application</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
