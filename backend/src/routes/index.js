import express from 'express'
import authRoutes from './auth.routes.js'
import projectRoutes from './project.routes.js'
import milestoneRoutes from './milestone.routes.js'
import auditRoutes from './audit.routes.js'

const router = express.Router()

// Mount routes
router.use('/auth', authRoutes)
router.use('/projects', projectRoutes)
router.use('/audit', auditRoutes)

// Mount milestone routes both as standalone and nested under projects
router.use('/milestones', milestoneRoutes)
router.use('/projects/:projectId/milestones', milestoneRoutes)

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Green Hydrogen Subsidy API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API info route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Green Hydrogen Subsidy Management API',
    version: process.env.npm_package_version || '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      authentication: '/api/auth',
      projects: '/api/projects', 
      milestones: '/api/milestones',
      audit: '/api/audit',
      health: '/api/health'
    },
    contact: {
      email: 'support@greenhydrogen.gov.in',
      website: 'https://greenhydrogen.gov.in'
    }
  })
})

export default router
