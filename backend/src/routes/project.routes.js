import express from 'express'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  approveProject,
  rejectProject,
  assignAuditor,
  getProjectStatistics,
  getProjectAuditTrail
} from '../controllers/project.controller.js'
import {
  protect,
  authorize,
  requireKYC
} from '../middleware/auth.js'
import {
  validateProject,
  validateQuery
} from '../middleware/validation.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// Routes accessible by all authenticated users
router.get('/', validateQuery, getProjects)
router.get('/statistics', getProjectStatistics)
router.get('/:id', getProject)
router.get('/:id/audit', getProjectAuditTrail)

// Routes for government users only
router.post('/', authorize('government'), requireKYC(), validateProject, createProject)
router.delete('/:id', authorize('government'), deleteProject)
router.post('/:id/approve', authorize('government'), approveProject)
router.post('/:id/reject', authorize('government'), rejectProject)
router.post('/:id/assign-auditor', authorize('government'), assignAuditor)

// Routes for government and producers
router.put('/:id', authorize('government', 'producer'), updateProject)

export default router
