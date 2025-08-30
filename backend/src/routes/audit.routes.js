import express from 'express'
import {
  getAuditLogs,
  getAuditTrail,
  getSecurityEvents,
  getUserActivity,
  getAuditStatistics,
  flagAuditLog,
  reviewAuditLog,
  exportAuditLogs
} from '../controllers/audit.controller.js'
import {
  protect,
  authorize
} from '../middleware/auth.js'
import {
  validateQuery
} from '../middleware/validation.js'

const router = express.Router()

// All routes are protected
router.use(protect)

// General audit routes (government and auditors only)
router.get('/', authorize('government', 'auditor'), validateQuery, getAuditLogs)
router.get('/statistics', authorize('government', 'auditor'), getAuditStatistics)
router.get('/security', authorize('government'), getSecurityEvents)
router.get('/export', authorize('government'), exportAuditLogs)

// Resource-specific audit trail
router.get('/trail/:resourceType/:resourceId', getAuditTrail)

// User activity (users can view their own, government/auditors can view any)
router.get('/user/:userId', getUserActivity)

// Audit log management (government and auditors only)
router.post('/:id/flag', authorize('government', 'auditor'), flagAuditLog)
router.post('/:id/review', authorize('government', 'auditor'), reviewAuditLog)

export default router
