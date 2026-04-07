import { createContext, useContext, useState, useCallback } from 'react'

const ResumeContext = createContext(null)

export function ResumeProvider({ children }) {
  const [currentResume, setCurrentResume] = useState(null)
  const [resumes, setResumes] = useState([])
  const [saving, setSaving] = useState(false)

  const updateCurrentResume = useCallback((updates) => {
    setCurrentResume(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  return (
    <ResumeContext.Provider value={{
      currentResume, setCurrentResume,
      resumes, setResumes,
      saving, setSaving,
      updateCurrentResume,
    }}>
      {children}
    </ResumeContext.Provider>
  )
}

export function useResumeContext() {
  const ctx = useContext(ResumeContext)
  if (!ctx) throw new Error('useResumeContext must be used within ResumeProvider')
  return ctx
}
