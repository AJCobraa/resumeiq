import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Spinner from '../ui/Spinner'
import { useState, useEffect } from 'react'

const SIDEBAR_WIDTH = 240
const COLLAPSED_WIDTH = 80

export default function AppLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  
  const isStudyCenter = location.pathname.startsWith('/study-center')

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed)
  }, [isCollapsed])

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
      {!isStudyCenter && <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />}
      {/* Inline style for margin-left ensures it always applies regardless of Tailwind purge */}
      <motion.main
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ 
          marginLeft: isStudyCenter ? 0 : (isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH), 
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease-in-out'
        }}
        className="flex flex-col overflow-y-auto"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
