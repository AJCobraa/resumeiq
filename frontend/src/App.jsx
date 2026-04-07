import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ResumeProvider } from './context/ResumeContext'
import { ToastProvider } from './components/ui/Toast'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import MyResumes from './pages/MyResumes'
import ResumeEditor from './pages/ResumeEditor'
import Settings from './pages/Settings'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ResumeProvider>
          <ToastProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />

              {/* Authenticated — wrapped in sidebar layout */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/resumes" element={<MyResumes />} />
                <Route path="/resumes/:resumeId" element={<ResumeEditor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Routes>
          </ToastProvider>
        </ResumeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
