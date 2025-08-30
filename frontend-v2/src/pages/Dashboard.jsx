import React from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FolderOpen,
  DollarSign,
  Activity,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const Dashboard = () => {
  const { user } = useAuth()

  // Mock data - replace with actual API calls
  const stats = [
    {
      title: 'Total Projects',
      value: '24',
      change: '+12%',
      changeType: 'positive',
      icon: FolderOpen
    },
    {
      title: 'Active Subsidies',
      value: '$2.4M',
      change: '+8%',
      changeType: 'positive',
      icon: DollarSign
    },
    {
      title: 'Completed Audits',
      value: '18',
      change: '+25%',
      changeType: 'positive',
      icon: CheckCircle
    },
    {
      title: 'Pending Reviews',
      value: '6',
      change: '-15%',
      changeType: 'negative',
      icon: Clock
    }
  ]

  const recentProjects = [
    {
      id: 1,
      name: 'Green Hydrogen Facility Alpha',
      status: 'active',
      progress: 75,
      budget: '$850,000',
      deadline: '2024-06-15'
    },
    {
      id: 2,
      name: 'Renewable Energy Hub Beta',
      status: 'pending',
      progress: 45,
      budget: '$1,200,000',
      deadline: '2024-08-30'
    },
    {
      id: 3,
      name: 'Sustainable Production Unit',
      status: 'completed',
      progress: 100,
      budget: '$675,000',
      deadline: '2024-03-20'
    }
  ]

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      pending: 'warning',
      completed: 'default',
      rejected: 'destructive'
    }
    return variants[status] || 'secondary'
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-primary-100">
            Welcome to your {user?.role} dashboard. Here's an overview of your green hydrogen projects.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{stat.title}</p>
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                    <span className={`text-xs font-medium ${
                      stat.changeType === 'positive' ? 'text-success-600' : 'text-error-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/50 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <Card.Header>
              <Card.Title>Recent Projects</Card.Title>
              <Card.Description>Latest updates on your green hydrogen projects</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">{project.name}</h4>
                      <Badge variant={getStatusBadge(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Budget: {project.budget}</span>
                        <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <Card.Header>
              <Card.Title>Recent Activity</Card.Title>
              <Card.Description>Latest updates and notifications</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-success-100 dark:bg-success-900/50 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-success-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Milestone completed</p>
                    <p className="text-xs text-muted-foreground">Green Hydrogen Facility Alpha - Phase 2</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-accent-100 dark:bg-accent-900/50 rounded-full flex items-center justify-center">
                    <Activity className="w-4 h-4 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Audit scheduled</p>
                    <p className="text-xs text-muted-foreground">Renewable Energy Hub Beta</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-warning-100 dark:bg-warning-900/50 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-warning-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Payment pending</p>
                    <p className="text-xs text-muted-foreground">Subsidy release for Project Delta</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
