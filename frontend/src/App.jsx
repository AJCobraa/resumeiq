import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ResumeProvider } from './context/ResumeContext'
import { ToastProvider } from './components/ui/Toast'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import MyResumes from './pages/MyResumes'
import ResumeEditor from './pages/ResumeEditor'
import Settings from './pages/Settings'
import PersonalStats from './pages/PersonalStats'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ResumeProvider>
          <ToastProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/features" element={<Navigate to="/" replace />} />
              <Route path="/pricing" element={<Navigate to="/" replace />} />

              {/* Authenticated — wrapped in sidebar layout */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/resumes" element={<MyResumes />} />
                <Route path="/resumes/:resumeId" element={<ResumeEditor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/stats" element={<PersonalStats />} />
              </Route>
            </Routes>
          </ToastProvider>
        </ResumeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
