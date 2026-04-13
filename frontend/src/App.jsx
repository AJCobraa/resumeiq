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
      { path: '/features', element: <Navigate to="/" replace /> },
      { path: '/pricing', element: <Navigate to="/" replace /> },
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/resumes', element: <MyResumes /> },
          { path: '/resumes/:resumeId', element: <ResumeEditor /> },
          { path: '/settings', element: <Settings /> },
          { path: '/stats', element: <PersonalStats /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
