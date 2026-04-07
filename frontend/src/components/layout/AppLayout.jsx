import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Spinner from '../ui/Spinner'

const SIDEBAR_WIDTH = 240

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar />
      {/* Inline style for margin-left ensures it always applies regardless of Tailwind purge */}
      <motion.main
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginLeft: SIDEBAR_WIDTH, height: '100vh' }}
        className="flex flex-col overflow-hidden"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
