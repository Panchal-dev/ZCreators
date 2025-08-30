import express from 'express'
import {
  getMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  startMilestone,
  completeMilestone,
  verifyMilestone,
  approveMilestone,
  releaseSubsidy,
  addMilestoneUpdate,
  getOverdueMilestones,
  getUpcomingMilestones,
  getMilestoneStatistics
} from '../controllers/milestone.controller.js'
import {
  protect,
  authorize,
  requireKYC,
  require2FA
} from '../middleware/auth.js'
import {
  validateMilestone,
  validateMilestoneUpdate,
  validateTransaction,
  validateQuery
} from '../middleware/validation.js'

const router = express.Router({ mergeParams: true })

// All routes are protected
router.use(protect)

// General milestone routes
router.get('/overdue', getOverdueMilestones)
router.get('/upcoming', getUpcomingMilestones)
router.get('/statistics', getMilestoneStatistics)

// Project-specific milestone routes
router.get('/', validateQuery, getMilestones)
router.post('/', authorize('government', 'producer'), requireKYC(), validateMilestone, createMilestone)

// Individual milestone routes
router.get('/:id', getMilestone)
router.put('/:id', authorize('government', 'producer', 'auditor'), validateMilestoneUpdate, updateMilestone)

// Milestone workflow routes
router.post('/:id/start', authorize('producer'), startMilestone)
router.post('/:id/complete', authorize('producer'), completeMilestone)
router.post('/:id/verify', authorize('auditor'), verifyMilestone)
router.post('/:id/approve', authorize('government'), approveMilestone)

// Subsidy release (requires 2FA for high-value transactions)
router.post('/:id/release-subsidy', authorize('government'), require2FA, validateTransaction, releaseSubsidy)

// Milestone updates
router.post('/:id/updates', addMilestoneUpdate)

export default router
