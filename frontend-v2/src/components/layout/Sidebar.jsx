import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  FolderOpen, 
  Target,
  FileSearch,
  Bell,
  Settings,
  User,
  LogOut,
  Leaf
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'

const Sidebar = ({ onClose }) => {
  const { user, logout, hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    onClose?.()
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['government', 'producer', 'auditor']
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderOpen,
      roles: ['government', 'producer', 'auditor']
    },
    {
      name: 'Milestones',
      href: '/milestones',
      icon: Target,
      roles: ['government', 'producer', 'auditor']
    },
    {
      name: 'Audits',
      href: '/audits',
      icon: FileSearch,
      roles: ['government', 'auditor']
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: Bell,
      roles: ['government', 'producer', 'auditor']
    },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  )

  return (
    <div className="flex flex-col h-full">
      {/* Logo and branding */}
      <div className="flex items-center px-6 py-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">GreenH2</h1>
            <p className="text-xs text-muted-foreground">Subsidy Platform</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary-100 dark:hover:bg-secondary-800'
              )}
            >
              <item.icon className={cn(
                'mr-3 h-5 w-5',
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-muted-foreground'
              )} />
              {item.name}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 w-0.5 h-6 bg-primary-600 rounded-r"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
        >
          <User className="mr-3 h-5 w-5" />
          Profile
        </Link>
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-950 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}

export default Sidebar
