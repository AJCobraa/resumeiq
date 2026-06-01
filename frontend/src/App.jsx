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
import CourseCatalog from './pages/CourseCatalog'
import CourseOverview from './pages/CourseOverview'
import ChapterReader from './pages/ChapterReader'
import SkillGapPage from './pages/SkillGapPage'
import CustomRoadmapPage from './pages/CustomRoadmapPage'
import MyRoadmapsPage from './pages/MyRoadmapsPage'
import RoadmapCanvas from './pages/RoadmapCanvas'
import InterviewSessionsListPage from './pages/InterviewSessionsListPage'
import JobSessionsPage from './pages/JobSessionsPage'
import InterviewPrepPage from './pages/InterviewPrepPage'
import InterviewSessionPage from './pages/InterviewSessionPage'
import InterviewRoundPage from './pages/InterviewRoundPage'

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
          
          { path: '/study-prep-center', element: <StudyCenter /> },
          { path: '/study-prep-center/catalog', element: <CourseCatalog /> },
          { path: '/study-prep-center/:courseId', element: <CourseOverview /> },
          { path: '/study-prep-center/:courseId/chapters/:chapterId', element: <ChapterReader /> },
          
          { path: '/study-prep-center/skill-gap', element: <SkillGapPage /> },
          { path: '/study-prep-center/interview-prep', element: <InterviewPrepPage /> },
          { path: '/study-prep-center/interview-prep/:sessionId', element: <InterviewSessionPage /> },
          { path: '/study-prep-center/interview-prep/:sessionId/round/:roundId', element: <InterviewRoundPage /> },
          { path: '/study-prep-center/learn-skill', element: <CustomRoadmapPage /> },
          { path: '/study-prep-center/roadmaps', element: <MyRoadmapsPage /> },
          { path: '/study-prep-center/roadmaps/:roadmapId', element: <RoadmapCanvas /> },
          { path: '/study-prep-center/interviews', element: <InterviewSessionsListPage /> },
          { path: '/study-prep-center/interviews/:jobId', element: <JobSessionsPage /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
