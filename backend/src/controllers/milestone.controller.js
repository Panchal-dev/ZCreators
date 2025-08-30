import { Milestone, Project, Audit } from '../models/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import logger from '../utils/logger.js'

// @desc    Get milestones for a project
// @route   GET /api/projects/:projectId/milestones
// @access  Private
export const getMilestones = asyncHandler(async (req, res) => {
  const { projectId } = req.params
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'sequenceNumber',
    sortOrder = 'asc'
  } = req.query

  const project = await Project.findById(projectId)
  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  // Check access permissions
  if (req.user.role === 'producer' && project.producer.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to view these milestones', 403)
  }

  if (req.user.role === 'auditor' && project.auditor?.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to view these milestones', 403)
  }

  const query = { project: projectId, isActive: true }
  if (status) query.status = status

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
    populate: [
      {
        path: 'verification.verifiedBy',
        select: 'name email'
      },
      {
        path: 'approval.approvedBy',
        select: 'name email'
      },
      {
        path: 'updates.updatedBy',
        select: 'name email'
      }
    ]
  }

  const milestones = await Milestone.paginate(query, options)

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'read',
    {
      type: 'milestone',
      name: 'Milestone List',
      details: { projectId }
    },
    {
      description: `Viewed milestones for project: ${project.name}`,
      category: 'data_access'
    }
  )

  res.json({
    success: true,
    data: {
      milestones: milestones.docs,
      pagination: {
        current: milestones.page,
        pages: milestones.totalPages,
        total: milestones.totalDocs,
        limit: milestones.limit
      }
    }
  })
})

// @desc    Get single milestone
// @route   GET /api/milestones/:id
// @access  Private
export const getMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findById(req.params.id)
    .populate('project', 'name producer government auditor')
    .populate('verification.verifiedBy', 'name email')
    .populate('approval.approvedBy', 'name email')
    .populate('updates.updatedBy', 'name email')

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  // Check access permissions
  const project = milestone.project
  if (req.user.role === 'producer' && project.producer.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to view this milestone', 403)
  }

  if (req.user.role === 'auditor' && project.auditor?.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to view this milestone', 403)
  }

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'read',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Viewed milestone: ${milestone.title}`,
      category: 'data_access'
    }
  )

  res.json({
    success: true,
    data: {
      milestone
    }
  })
})

// @desc    Create new milestone
// @route   POST /api/projects/:projectId/milestones
// @access  Private (Government and Producer)
export const createMilestone = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const project = await Project.findById(projectId)
  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  // Check permissions
  const canCreate = 
    req.user.role === 'government' ||
    (req.user.role === 'producer' && project.producer.toString() === req.user.id)

  if (!canCreate) {
    throw new ErrorResponse('Not authorized to create milestones for this project', 403)
  }

  const milestoneData = {
    ...req.body,
    project: projectId,
    projectId: project.projectId
  }

  const milestone = await Milestone.create(milestoneData)

  // Update project milestone count
  await project.addMilestone()

  await milestone.populate([
    {
      path: 'project',
      select: 'name producer government'
    }
  ])

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'create',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Created milestone: ${milestone.title} for project: ${project.name}`,
      category: 'data_modification',
      severity: 'medium'
    }
  )

  logger.info(`New milestone created: ${milestone.title} by ${req.user.email}`)

  res.status(201).json({
    success: true,
    message: 'Milestone created successfully',
    data: {
      milestone
    }
  })
})

// @desc    Update milestone
// @route   PUT /api/milestones/:id
// @access  Private
export const updateMilestone = asyncHandler(async (req, res) => {
  let milestone = await Milestone.findById(req.params.id)

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  const project = await Project.findById(milestone.project)

  // Check permissions
  const canUpdate = 
    req.user.role === 'government' ||
    (req.user.role === 'producer' && project.producer.toString() === req.user.id) ||
    (req.user.role === 'auditor' && project.auditor?.toString() === req.user.id)

  if (!canUpdate) {
    throw new ErrorResponse('Not authorized to update this milestone', 403)
  }

  // Store old values for audit
  const oldValues = {
    status: milestone.status,
    completionPercentage: milestone.completionPercentage
  }

  milestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('project', 'name')

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'update',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Updated milestone: ${milestone.title}`,
      category: 'data_modification',
      context: {
        oldValues,
        newValues: req.body
      }
    }
  )

  res.json({
    success: true,
    message: 'Milestone updated successfully',
    data: {
      milestone
    }
  })
})

// @desc    Start milestone
// @route   POST /api/milestones/:id/start
// @access  Private (Producer)
export const startMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findById(req.params.id)

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  const project = await Project.findById(milestone.project)

  // Only producer can start milestones
  if (req.user.role !== 'producer' || project.producer.toString() !== req.user.id) {
    throw new ErrorResponse('Only the project producer can start milestones', 403)
  }

  if (milestone.status !== 'pending') {
    throw new ErrorResponse(`Milestone is ${milestone.status} and cannot be started`, 400)
  }

  await milestone.start(req.user.id)

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'update',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Started milestone: ${milestone.title}`,
      category: 'data_modification'
    }
  )

  res.json({
    success: true,
    message: 'Milestone started successfully',
    data: {
      milestone
    }
  })
})

// @desc    Complete milestone
// @route   POST /api/milestones/:id/complete
// @access  Private (Producer)
export const completeMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findById(req.params.id)

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  const project = await Project.findById(milestone.project)

  // Only producer can complete milestones
  if (req.user.role !== 'producer' || project.producer.toString() !== req.user.id) {
    throw new ErrorResponse('Only the project producer can complete milestones', 403)
  }

  if (milestone.status === 'completed') {
    throw new ErrorResponse('Milestone is already completed', 400)
  }

  await milestone.complete(req.user.id)

  // Update project milestone count
  await project.completeMilestone()

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'update',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Completed milestone: ${milestone.title}`,
      category: 'data_modification',
      severity: 'medium'
    }
  )

  logger.info(`Milestone completed: ${milestone.title} by ${req.user.email}`)

  res.json({
    success: true,
    message: 'Milestone completed successfully',
    data: {
      milestone
    }
  })
})

// @desc    Verify milestone
// @route   POST /api/milestones/:id/verify
// @access  Private (Auditor)
export const verifyMilestone = asyncHandler(async (req, res) => {
  const { comments } = req.body
  
  const milestone = await Milestone.findById(req.params.id)

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  const project = await Project.findById(milestone.project)

  // Only assigned auditor can verify
  if (req.user.role !== 'auditor' || project.auditor?.toString() !== req.user.id) {
    throw new ErrorResponse('Only the assigned auditor can verify milestones', 403)
  }

  if (milestone.status !== 'completed') {
    throw new ErrorResponse('Only completed milestones can be verified', 400)
  }

  if (milestone.verification.isVerified) {
    throw new ErrorResponse('Milestone is already verified', 400)
  }

  await milestone.verify(req.user.id, comments)

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'verify',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Verified milestone: ${milestone.title}${comments ? '. Comments: ' + comments : ''}`,
      category: 'data_modification',
      severity: 'medium'
    }
  )

  logger.info(`Milestone verified: ${milestone.title} by ${req.user.email}`)

  res.json({
    success: true,
    message: 'Milestone verified successfully',
    data: {
      milestone
    }
  })
})

// @desc    Approve milestone
// @route   POST /api/milestones/:id/approve
// @access  Private (Government)
export const approveMilestone = asyncHandler(async (req, res) => {
  const { comments } = req.body
  
  const milestone = await Milestone.findById(req.params.id)

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  // Only government can approve
  if (req.user.role !== 'government') {
    throw new ErrorResponse('Only government entities can approve milestones', 403)
  }

  if (!milestone.verification.isVerified) {
    throw new ErrorResponse('Milestone must be verified before approval', 400)
  }

  if (milestone.approval.isApproved) {
    throw new ErrorResponse('Milestone is already approved', 400)
  }

  await milestone.approve(req.user.id, comments)

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'approve',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Approved milestone: ${milestone.title}${comments ? '. Comments: ' + comments : ''}`,
      category: 'data_modification',
      severity: 'medium'
    }
  )

  logger.info(`Milestone approved: ${milestone.title} by ${req.user.email}`)

  res.json({
    success: true,
    message: 'Milestone approved successfully',
    data: {
      milestone
    }
  })
})

// @desc    Release subsidy for milestone
// @route   POST /api/milestones/:id/release-subsidy
// @access  Private (Government)
export const releaseSubsidy = asyncHandler(async (req, res) => {
  const { txHash } = req.body
  
  const milestone = await Milestone.findById(req.params.id)

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  // Only government can release subsidy
  if (req.user.role !== 'government') {
    throw new ErrorResponse('Only government entities can release subsidies', 403)
  }

  if (!milestone.approval.isApproved) {
    throw new ErrorResponse('Milestone must be approved before subsidy release', 400)
  }

  if (milestone.released) {
    throw new ErrorResponse('Subsidy already released for this milestone', 400)
  }

  await milestone.releaseSubsidy(txHash)

  const project = await Project.findById(milestone.project)
  await project.completeMilestone(milestone.subsidyAmount)

  // Log blockchain transaction
  await Audit.logBlockchainTransaction(
    txHash,
    project.contractAddress,
    'releaseSubsidy',
    {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role
    },
    {
      description: `Subsidy released for milestone: ${milestone.title}`,
      financial: {
        amount: milestone.subsidyAmount,
        currency: 'INR',
        toAddress: project.producerWalletAddress
      }
    }
  )

  logger.info(`Subsidy released: ${milestone.subsidyAmount} for milestone ${milestone.title} by ${req.user.email}`)

  res.json({
    success: true,
    message: 'Subsidy released successfully',
    data: {
      milestone,
      transaction: {
        hash: txHash,
        amount: milestone.subsidyAmount
      }
    }
  })
})

// @desc    Add milestone update
// @route   POST /api/milestones/:id/updates
// @access  Private
export const addMilestoneUpdate = asyncHandler(async (req, res) => {
  const { message, type = 'general' } = req.body
  
  const milestone = await Milestone.findById(req.params.id)

  if (!milestone) {
    throw new ErrorResponse('Milestone not found', 404)
  }

  const project = await Project.findById(milestone.project)

  // Check permissions
  const canUpdate = 
    req.user.role === 'government' ||
    (req.user.role === 'producer' && project.producer.toString() === req.user.id) ||
    (req.user.role === 'auditor' && project.auditor?.toString() === req.user.id)

  if (!canUpdate) {
    throw new ErrorResponse('Not authorized to add updates to this milestone', 403)
  }

  await milestone.addUpdate(message, req.user.id, type)

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'update',
    {
      type: 'milestone',
      id: milestone._id.toString(),
      name: milestone.title
    },
    {
      description: `Added update to milestone: ${milestone.title}`,
      category: 'data_modification'
    }
  )

  res.json({
    success: true,
    message: 'Update added successfully',
    data: {
      milestone
    }
  })
})

// @desc    Get overdue milestones
// @route   GET /api/milestones/overdue
// @access  Private
export const getOverdueMilestones = asyncHandler(async (req, res) => {
  let overdueMilestones

  if (req.user.role === 'producer') {
    // Get overdue milestones for producer's projects
    overdueMilestones = await Milestone.find({
      plannedEndDate: { $lt: new Date() },
      status: { $in: ['pending', 'in_progress'] },
      isActive: true
    })
      .populate({
        path: 'project',
        match: { producer: req.user.id },
        select: 'name producer'
      })
      .populate('project.producer', 'name email')
  } else {
    // System-wide overdue milestones for government and auditors
    overdueMilestones = await Milestone.findOverdue()
  }

  // Filter out milestones where project is null (due to populate match)
  overdueMilestones = overdueMilestones.filter(m => m.project)

  res.json({
    success: true,
    data: {
      milestones: overdueMilestones,
      count: overdueMilestones.length
    }
  })
})

// @desc    Get upcoming milestones
// @route   GET /api/milestones/upcoming
// @access  Private
export const getUpcomingMilestones = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query
  
  let upcomingMilestones

  if (req.user.role === 'producer') {
    // Get upcoming milestones for producer's projects
    const today = new Date()
    const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000))
    
    upcomingMilestones = await Milestone.find({
      plannedEndDate: { $gte: today, $lte: futureDate },
      status: { $in: ['pending', 'in_progress'] },
      isActive: true
    })
      .populate({
        path: 'project',
        match: { producer: req.user.id },
        select: 'name producer'
      })
      .populate('project.producer', 'name email')
      .sort({ plannedEndDate: 1 })
  } else {
    upcomingMilestones = await Milestone.findUpcoming(days)
  }

  // Filter out milestones where project is null
  upcomingMilestones = upcomingMilestones.filter(m => m.project)

  res.json({
    success: true,
    data: {
      milestones: upcomingMilestones,
      count: upcomingMilestones.length
    }
  })
})

// @desc    Get milestone statistics
// @route   GET /api/milestones/statistics
// @access  Private
export const getMilestoneStatistics = asyncHandler(async (req, res) => {
  const { projectId } = req.query
  
  let stats

  if (req.user.role === 'producer') {
    // Producer-specific stats
    if (projectId) {
      const project = await Project.findById(projectId)
      if (!project || project.producer.toString() !== req.user.id) {
        throw new ErrorResponse('Project not found or unauthorized', 404)
      }
      stats = await Milestone.getStatistics(projectId)
    } else {
      // Get stats for all producer's projects
      const projects = await Project.find({ producer: req.user.id }, '_id')
      const projectIds = projects.map(p => p._id)
      
      const milestones = await Milestone.find({ project: { $in: projectIds }, isActive: true })
      
      stats = {
        totalMilestones: milestones.length,
        completedMilestones: milestones.filter(m => m.status === 'completed').length,
        overdueMilestones: milestones.filter(m => m.status === 'overdue').length,
        totalSubsidy: milestones.reduce((sum, m) => sum + m.subsidyAmount, 0),
        releasedSubsidy: milestones.reduce((sum, m) => sum + (m.released ? m.subsidyAmount : 0), 0),
        avgCompletion: milestones.reduce((sum, m) => sum + m.completionPercentage, 0) / milestones.length || 0
      }
    }
  } else {
    stats = await Milestone.getStatistics(projectId)
  }

  res.json({
    success: true,
    data: {
      statistics: stats
    }
  })
})
