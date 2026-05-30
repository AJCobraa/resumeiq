import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
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
import Plans from './pages/Plans'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Features from './pages/Features'
import Onboarding from './pages/Onboarding'

// Study Center Pages
import StudyCenter from './pages/StudyCenter'
import CourseOverview from './pages/CourseOverview'
import ChapterReader from './pages/ChapterReader'

function AppProviders() {
  return (
    <AuthProvider>
      <ResumeProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </ResumeProvider>
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <AppProviders />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/features', element: <Features /> },
      { path: '/privacy-policy', element: <PrivacyPolicy /> },
      { path: '/onboarding', element: <Onboarding /> },
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/resumes', element: <MyResumes /> },
          { path: '/resumes/:resumeId', element: <ResumeEditor /> },
          { path: '/settings', element: <Settings /> },
          { path: '/stats', element: <PersonalStats /> },
          { path: '/plans', element: <Plans /> },
          { path: '/pricing', element: <Plans /> },
          
          { path: '/study-center', element: <StudyCenter /> },
          { path: '/study-center/:courseId', element: <CourseOverview /> },
          { path: '/study-center/:courseId/chapters/:chapterId', element: <ChapterReader /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
