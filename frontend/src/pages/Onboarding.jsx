import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Step1Welcome from '../components/onboarding/Step1Welcome'
import Step2Import from '../components/onboarding/Step2Import'
import Step3Extension from '../components/onboarding/Step3Extension'
import Step4Analysis from '../components/onboarding/Step4Analysis'
import Step5Magic from '../components/onboarding/Step5Magic'
import Step6Ready from '../components/onboarding/Step6Ready'

const steps = [
  { id: 1, component: Step1Welcome },
  { id: 2, component: Step2Import },
  { id: 3, component: Step3Extension },
  { id: 4, component: Step4Analysis },
  { id: 5, component: Step5Magic },
  { id: 6, component: Step6Ready },
]

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const navigate = useNavigate()

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1)
    } else {
      navigate('/dashboard')
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handleBack()
      if (e.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep])

  const CurrentComponent = steps[currentStep - 1].component

  return (
    <div className="h-screen w-screen bg-background overflow-hidden flex flex-col font-sans selection:bg-primary/10 selection:text-primary">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-brand-dark flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-lg">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">
            Resume<span className="text-foreground">IQ</span>
          </span>
        </div>
        <button
          onClick={handleSkip}
          className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now &rarr;
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex items-center justify-center pt-16 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full h-full"
          >
            <CurrentComponent onNext={handleNext} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 flex items-center justify-between px-8 z-50 bg-background/80 backdrop-blur-md border-t border-border/40">
        <div className="flex-1" />
        
        {/* Progress Dots */}
        <div className="flex gap-2">
          {steps.map((step) => (
            <button className="cursor-pointer"
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentStep === step.id ? 'bg-primary w-6' : 'bg-secondary hover:bg-muted-foreground/30'
              }`}
              aria-label={`Go to step ${step.id}`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex-1 flex justify-end gap-3">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Back
            </button>
          )}
          {currentStep < steps.length && (
            <button
              onClick={handleNext}
              className="cursor-pointer px-6 py-2 rounded-xl bg-foreground text-background text-sm font-semibold shadow-sm hover:bg-foreground/90 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
