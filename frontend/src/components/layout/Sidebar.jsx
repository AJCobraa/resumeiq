import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import CoinBalance from '../billing/CoinBalance'

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'My Resumes',
    path: '/resumes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'My Stats',
    path: '/stats',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: 'Plans & Billing',
    path: '/plans',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
]

export default function Sidebar({ isCollapsed, onToggle }) {
  const { user, profile, logOut } = useAuth()

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-bg-card border-r border-border-default flex flex-col z-40 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[80px]" : "w-[240px]"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute -right-3 top-8 w-6 h-6 bg-bg-card border border-border-default rounded-full flex items-center justify-center shadow-sm hover:bg-bg-elevated transition-all duration-200 z-50 cursor-pointer",
          isCollapsed && "rotate-180"
        )}
      >
        <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Logo */}
      <div className={cn(
        "px-5 py-6 border-b border-border-default overflow-hidden",
        isCollapsed && "px-0 flex justify-center"
      )}>
        <div className="flex items-center gap-2.5 min-w-max">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-purple-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tight whitespace-nowrap animate-in fade-in duration-300">
              Resume<span className="text-accent-blue">IQ</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.label : ""}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-all duration-200',
              isCollapsed && "justify-center px-0 h-10 w-10 mx-auto",
              isActive
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated',
            )}
          >
            <div className="flex-shrink-0">
              {item.icon}
            </div>
            {!isCollapsed && (
              <span className="whitespace-nowrap animate-in fade-in duration-300">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Coin Balance */}
      <CoinBalance isCollapsed={isCollapsed} />

      {/* User section */}
      <div className={cn(
        "px-3 py-4 border-t border-border-default",
        isCollapsed && "px-0"
      )}>
        <div className={cn(
          "flex items-center gap-3 px-2 mb-3",
          isCollapsed && "justify-center px-0"
        )}>
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Avatar"
              className="w-8 h-8 rounded-full ring-2 ring-border-default flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent-blue text-xs font-bold">
                {(profile?.displayName || user?.email || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
              <p className="text-sm font-medium truncate">
                {profile?.displayName || 'User'}
              </p>
              <p className="text-xs text-text-muted truncate">
                {user?.email || ''}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logOut}
          title={isCollapsed ? "Sign Out" : ""}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-red rounded-[6px] hover:bg-red/5 transition-all duration-200 cursor-pointer",
            isCollapsed && "justify-center px-0"
          )}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span className="animate-in fade-in duration-300">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
