import { Audit, User } from '../models/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

// @desc    Get audit logs
// @route   GET /api/audit
// @access  Private (Government and Auditor)
export const getAuditLogs = asyncHandler(async (req, res) => {
  // Only government and auditors can view audit logs
  if (!['government', 'auditor'].includes(req.user.role)) {
    throw new ErrorResponse('Not authorized to view audit logs', 403)
  }

  const {
    page = 1,
    limit = 50,
    eventType,
    category,
    severity,
    userId,
    startDate,
    endDate,
    resourceType,
    resourceId,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = req.query

  const query = {}

  // Build query filters
  if (eventType) query.eventType = eventType
  if (category) query.category = category
  if (severity) query.severity = severity
  if (userId) query['actor.userId'] = userId
  if (resourceType) query['resource.type'] = resourceType
  if (resourceId) query['resource.id'] = resourceId

  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) query.timestamp.$gte = new Date(startDate)
    if (endDate) query.timestamp.$lte = new Date(endDate)
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      {
        path: 'actor.userId',
        select: 'name email role'
      },
      {
        path: 'reviewedBy',
        select: 'name email'
      }
    ]
  }

  const auditLogs = await Audit.paginate(query, options)

  // Log that someone viewed audit logs
  await Audit.createAuditLog({
    eventType: 'data_export',
    actor: {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'system',
      name: 'Audit Logs'
    },
    action: 'read',
    description: `Viewed audit logs (${auditLogs.docs.length} records)`,
    category: 'data_access',
    severity: 'medium'
  })

  res.json({
    success: true,
    data: {
      auditLogs: auditLogs.docs,
      pagination: {
        current: auditLogs.page,
        pages: auditLogs.totalPages,
        total: auditLogs.totalDocs,
        limit: auditLogs.limit
      }
    }
  })
})

// @desc    Get audit trail for specific resource
// @route   GET /api/audit/trail/:resourceType/:resourceId
// @access  Private
export const getAuditTrail = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params
  const { limit = 50 } = req.query

  // Check permissions based on resource type
  if (req.user.role === 'producer' && resourceType === 'project') {
    // Verify producer owns the project
    const Project = (await import('../models/index.js')).Project
    const project = await Project.findById(resourceId)
    if (!project || project.producer.toString() !== req.user.id) {
      throw new ErrorResponse('Not authorized to view this audit trail', 403)
    }
  } else if (!['government', 'auditor'].includes(req.user.role)) {
    throw new ErrorResponse('Not authorized to view audit trails', 403)
  }

  const auditTrail = await Audit.getAuditTrail(resourceType, resourceId, limit)

  // Log audit trail access
  await Audit.createAuditLog({
    eventType: 'data_export',
    actor: {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: resourceType,
      id: resourceId,
      name: `${resourceType} audit trail`
    },
    action: 'read',
    description: `Viewed audit trail for ${resourceType}: ${resourceId}`,
    category: 'data_access'
  })

  res.json({
    success: true,
    data: {
      auditTrail,
      count: auditTrail.length
    }
  })
})

// @desc    Get security events
// @route   GET /api/audit/security
// @access  Private (Government only)
export const getSecurityEvents = asyncHandler(async (req, res) => {
  // Only government can view security events
  if (req.user.role !== 'government') {
    throw new ErrorResponse('Not authorized to view security events', 403)
  }

  const {
    startDate,
    endDate,
    severity = 'medium',
    limit = 100
  } = req.query

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = endDate ? new Date(endDate) : new Date()

  const securityEvents = await Audit.getSecurityEvents(start, end, severity)
    .limit(parseInt(limit))

  // Log security events access
  await Audit.logSecurityEvent(
    'security_log_access',
    {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    `Accessed security events log (${securityEvents.length} events)`,
    'high'
  )

  res.json({
    success: true,
    data: {
      securityEvents,
      count: securityEvents.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    }
  })
})

// @desc    Get user activity
// @route   GET /api/audit/user/:userId
// @access  Private
export const getUserActivity = asyncHandler(async (req, res) => {
  const { userId } = req.params
  const { limit = 100 } = req.query

  // Users can only view their own activity unless they're government/auditor
  if (req.user.id !== userId && !['government', 'auditor'].includes(req.user.role)) {
    throw new ErrorResponse('Not authorized to view this user activity', 403)
  }

  // Verify user exists
  const user = await User.findById(userId)
  if (!user) {
    throw new ErrorResponse('User not found', 404)
  }

  const userActivity = await Audit.getUserActivity(userId, limit)

  // Log user activity access
  await Audit.createAuditLog({
    eventType: 'data_export',
    actor: {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'user',
      id: userId,
      name: user.name
    },
    action: 'read',
    description: `Viewed user activity for: ${user.name}`,
    category: 'data_access'
  })

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      activity: userActivity,
      count: userActivity.length
    }
  })
})

// @desc    Get audit statistics
// @route   GET /api/audit/statistics
// @access  Private (Government and Auditor)
export const getAuditStatistics = asyncHandler(async (req, res) => {
  // Only government and auditors can view audit statistics
  if (!['government', 'auditor'].includes(req.user.role)) {
    throw new ErrorResponse('Not authorized to view audit statistics', 403)
  }

  const {
    startDate,
    endDate
  } = req.query

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = endDate ? new Date(endDate) : new Date()

  const statistics = await Audit.getStatistics(start, end)

  // Get additional breakdowns
  const eventTypeBreakdown = await Audit.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ])

  const categoryBreakdown = await Audit.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ])

  const userActivityBreakdown = await Audit.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end },
        'actor.userId': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$actor.userId',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        count: 1
      }
    }
  ])

  // Log statistics access
  await Audit.createAuditLog({
    eventType: 'data_export',
    actor: {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'system',
      name: 'Audit Statistics'
    },
    action: 'read',
    description: 'Viewed audit statistics',
    category: 'data_access'
  })

  res.json({
    success: true,
    data: {
      statistics: {
        ...statistics,
        eventTypeBreakdown,
        categoryBreakdown,
        userActivityBreakdown
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    }
  })
})

// @desc    Flag audit log for review
// @route   POST /api/audit/:id/flag
// @access  Private (Government and Auditor)
export const flagAuditLog = asyncHandler(async (req, res) => {
  // Only government and auditors can flag audit logs
  if (!['government', 'auditor'].includes(req.user.role)) {
    throw new ErrorResponse('Not authorized to flag audit logs', 403)
  }

  const { reason } = req.body
  const auditLog = await Audit.findById(req.params.id)

  if (!auditLog) {
    throw new ErrorResponse('Audit log not found', 404)
  }

  if (auditLog.flagged) {
    throw new ErrorResponse('Audit log is already flagged', 400)
  }

  await auditLog.flagForReview(reason, req.user.id)

  // Log the flagging action
  await Audit.createAuditLog({
    eventType: 'admin_action',
    actor: {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'audit',
      id: auditLog._id.toString(),
      name: 'Audit Log'
    },
    action: 'update',
    description: `Flagged audit log for review. Reason: ${reason}`,
    category: 'data_modification',
    severity: 'medium'
  })

  res.json({
    success: true,
    message: 'Audit log flagged for review successfully',
    data: {
      auditLog
    }
  })
})

// @desc    Mark audit log as reviewed
// @route   POST /api/audit/:id/review
// @access  Private (Government and Auditor)
export const reviewAuditLog = asyncHandler(async (req, res) => {
  // Only government and auditors can review audit logs
  if (!['government', 'auditor'].includes(req.user.role)) {
    throw new ErrorResponse('Not authorized to review audit logs', 403)
  }

  const auditLog = await Audit.findById(req.params.id)

  if (!auditLog) {
    throw new ErrorResponse('Audit log not found', 404)
  }

  if (auditLog.reviewed) {
    throw new ErrorResponse('Audit log is already reviewed', 400)
  }

  await auditLog.markAsReviewed(req.user.id)

  // Log the review action
  await Audit.createAuditLog({
    eventType: 'admin_action',
    actor: {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'audit',
      id: auditLog._id.toString(),
      name: 'Audit Log'
    },
    action: 'update',
    description: 'Marked audit log as reviewed',
    category: 'data_modification',
    severity: 'low'
  })

  res.json({
    success: true,
    message: 'Audit log marked as reviewed successfully',
    data: {
      auditLog
    }
  })
})

// @desc    Export audit logs
// @route   GET /api/audit/export
// @access  Private (Government only)
export const exportAuditLogs = asyncHandler(async (req, res) => {
  // Only government can export audit logs
  if (req.user.role !== 'government') {
    throw new ErrorResponse('Not authorized to export audit logs', 403)
  }

  const {
    format = 'json',
    startDate,
    endDate,
    eventType,
    category,
    severity
  } = req.query

  const query = {}

  // Build query filters
  if (eventType) query.eventType = eventType
  if (category) query.category = category
  if (severity) query.severity = severity

  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) query.timestamp.$gte = new Date(startDate)
    if (endDate) query.timestamp.$lte = new Date(endDate)
  }

  const auditLogs = await Audit.find(query)
    .populate('actor.userId', 'name email role')
    .sort({ timestamp: -1 })
    .limit(10000) // Limit for performance

  // Log export action
  await Audit.logSecurityEvent(
    'data_export',
    {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    `Exported ${auditLogs.length} audit logs in ${format} format`,
    'high'
  )

  if (format === 'csv') {
    // Convert to CSV format
    const csv = auditLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      eventType: log.eventType,
      actor: log.actor?.userId?.email || 'System',
      action: log.action,
      resource: `${log.resource.type}: ${log.resource.name || log.resource.id}`,
      description: log.description,
      category: log.category,
      severity: log.severity
    }))

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`)
    
    // Simple CSV conversion (in production, use proper CSV library)
    const csvContent = [
      Object.keys(csv[0]).join(','),
      ...csv.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    res.send(csvContent)
  } else {
    // JSON format
    res.json({
      success: true,
      data: {
        auditLogs,
        count: auditLogs.length,
        exportedAt: new Date().toISOString()
      }
    })
  }
})
