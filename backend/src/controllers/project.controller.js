import { Project, Milestone, User, Audit } from '../models/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import logger from '../utils/logger.js'

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    producer,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query

  const query = { isActive: true }

  // Role-based filtering
  if (req.user.role === 'producer') {
    query.producer = req.user.id
  } else if (req.user.role === 'auditor') {
    query.auditor = req.user.id
  } else if (req.user.role === 'government' && producer) {
    query.producer = producer
  }

  // Additional filters
  if (status) query.status = status
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { projectId: { $regex: search, $options: 'i' } }
    ]
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      {
        path: 'producer',
        select: 'name email organization walletAddress'
      },
      {
        path: 'government',
        select: 'name email organization'
      },
      {
        path: 'auditor',
        select: 'name email organization'
      }
    ]
  }

  const projects = await Project.paginate(query, options)

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'read',
    {
      type: 'project',
      name: 'Project List'
    },
    {
      description: `Viewed projects list (${projects.docs.length} projects)`,
      category: 'data_access'
    }
  )

  res.json({
    success: true,
    data: {
      projects: projects.docs,
      pagination: {
        current: projects.page,
        pages: projects.totalPages,
        total: projects.totalDocs,
        limit: projects.limit
      }
    }
  })
})

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('producer', 'name email organization walletAddress')
    .populate('government', 'name email organization')
    .populate('auditor', 'name email organization')

  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  // Check access permissions
  if (req.user.role === 'producer' && project.producer._id.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to view this project', 403)
  }

  if (req.user.role === 'auditor' && project.auditor?._id.toString() !== req.user.id) {
    throw new ErrorResponse('Not authorized to view this project', 403)
  }

  // Get project milestones
  const milestones = await Milestone.find({ project: project._id, isActive: true })
    .sort({ sequenceNumber: 1 })

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'read',
    {
      type: 'project',
      id: project._id.toString(),
      name: project.name
    },
    {
      description: `Viewed project details: ${project.name}`,
      category: 'data_access'
    }
  )

  res.json({
    success: true,
    data: {
      project: {
        ...project.toObject(),
        milestones
      }
    }
  })
})

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Government only)
export const createProject = asyncHandler(async (req, res) => {
  // Only government users can create projects
  if (req.user.role !== 'government') {
    throw new ErrorResponse('Only government entities can create projects', 403)
  }

  const projectData = {
    ...req.body,
    government: req.user.id
  }

  // Validate producer exists
  const producer = await User.findById(projectData.producer)
  if (!producer || producer.role !== 'producer') {
    throw new ErrorResponse('Invalid producer ID', 400)
  }

  // Set producer wallet address
  projectData.producerWalletAddress = producer.walletAddress

  const project = await Project.create(projectData)

  await project.populate([
    {
      path: 'producer',
      select: 'name email organization walletAddress'
    },
    {
      path: 'government',
      select: 'name email organization'
    }
  ])

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'create',
    {
      type: 'project',
      id: project._id.toString(),
      name: project.name
    },
    {
      description: `Created new project: ${project.name}`,
      category: 'data_modification',
      severity: 'medium'
    }
  )

  logger.info(`New project created: ${project.name} by ${req.user.email}`)

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: {
      project
    }
  })
})

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id)

  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  // Check permissions
  const canUpdate = 
    req.user.role === 'government' ||
    (req.user.role === 'producer' && project.producer.toString() === req.user.id)

  if (!canUpdate) {
    throw new ErrorResponse('Not authorized to update this project', 403)
  }

  // Store old values for audit
  const oldValues = {
    status: project.status,
    totalSubsidy: project.totalSubsidy
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('producer government auditor', 'name email organization')

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'update',
    {
      type: 'project',
      id: project._id.toString(),
      name: project.name
    },
    {
      description: `Updated project: ${project.name}`,
      category: 'data_modification',
      context: {
        oldValues,
        newValues: req.body
      }
    }
  )

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: {
      project
    }
  })
})

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Government only)
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  // Only government can delete projects
  if (req.user.role !== 'government') {
    throw new ErrorResponse('Only government entities can delete projects', 403)
  }

  // Soft delete
  project.isActive = false
  await project.save()

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'delete',
    {
      type: 'project',
      id: project._id.toString(),
      name: project.name
    },
    {
      description: `Deleted project: ${project.name}`,
      category: 'data_modification',
      severity: 'high'
    }
  )

  res.json({
    success: true,
    message: 'Project deleted successfully'
  })
})

// @desc    Approve project
// @route   POST /api/projects/:id/approve
// @access  Private (Government only)
export const approveProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  if (req.user.role !== 'government') {
    throw new ErrorResponse('Only government entities can approve projects', 403)
  }

  if (project.approvalStatus === 'approved') {
    throw new ErrorResponse('Project is already approved', 400)
  }

  project.approvalStatus = 'approved'
  project.status = 'active'
  project.approvalDate = new Date()
  project.approvedBy = req.user.id

  await project.save()

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'approve',
    {
      type: 'project',
      id: project._id.toString(),
      name: project.name
    },
    {
      description: `Approved project: ${project.name}`,
      category: 'data_modification',
      severity: 'medium'
    }
  )

  logger.info(`Project approved: ${project.name} by ${req.user.email}`)

  res.json({
    success: true,
    message: 'Project approved successfully',
    data: {
      project
    }
  })
})

// @desc    Reject project
// @route   POST /api/projects/:id/reject
// @access  Private (Government only)
export const rejectProject = asyncHandler(async (req, res) => {
  const { reason } = req.body
  
  const project = await Project.findById(req.params.id)

  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  if (req.user.role !== 'government') {
    throw new ErrorResponse('Only government entities can reject projects', 403)
  }

  project.approvalStatus = 'rejected'
  project.status = 'cancelled'
  project.approvalDate = new Date()
  project.approvedBy = req.user.id

  // Add notification
  project.notifications.push({
    type: 'status_change',
    message: `Project rejected. Reason: ${reason || 'No reason provided'}`,
    createdAt: new Date()
  })

  await project.save()

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'reject',
    {
      type: 'project',
      id: project._id.toString(),
      name: project.name
    },
    {
      description: `Rejected project: ${project.name}. Reason: ${reason || 'No reason provided'}`,
      category: 'data_modification',
      severity: 'medium'
    }
  )

  res.json({
    success: true,
    message: 'Project rejected successfully',
    data: {
      project
    }
  })
})

// @desc    Assign auditor to project
// @route   POST /api/projects/:id/assign-auditor
// @access  Private (Government only)
export const assignAuditor = asyncHandler(async (req, res) => {
  const { auditorId } = req.body
  
  const project = await Project.findById(req.params.id)

  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  if (req.user.role !== 'government') {
    throw new ErrorResponse('Only government entities can assign auditors', 403)
  }

  // Validate auditor
  const auditor = await User.findById(auditorId)
  if (!auditor || auditor.role !== 'auditor') {
    throw new ErrorResponse('Invalid auditor ID', 400)
  }

  project.auditor = auditorId
  await project.save()

  await project.populate('auditor', 'name email organization')

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'update',
    {
      type: 'project',
      id: project._id.toString(),
      name: project.name
    },
    {
      description: `Assigned auditor ${auditor.name} to project: ${project.name}`,
      category: 'data_modification'
    }
  )

  res.json({
    success: true,
    message: 'Auditor assigned successfully',
    data: {
      project
    }
  })
})

// @desc    Get project statistics
// @route   GET /api/projects/statistics
// @access  Private
export const getProjectStatistics = asyncHandler(async (req, res) => {
  let stats

  if (req.user.role === 'producer') {
    // Producer-specific stats
    const projects = await Project.find({ producer: req.user.id, isActive: true })
    stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      totalSubsidy: projects.reduce((sum, p) => sum + p.totalSubsidy, 0),
      totalReleased: projects.reduce((sum, p) => sum + p.released, 0)
    }
  } else {
    // System-wide stats for government and auditors
    stats = await Project.getStatistics()
  }

  // Log audit event
  await Audit.logUserAction(
    req.user.id,
    'read',
    {
      type: 'project',
      name: 'Project Statistics'
    },
    {
      description: 'Viewed project statistics',
      category: 'data_access'
    }
  )

  res.json({
    success: true,
    data: {
      statistics: stats
    }
  })
})

// @desc    Get project audit trail
// @route   GET /api/projects/:id/audit
// @access  Private
export const getProjectAuditTrail = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)

  if (!project) {
    throw new ErrorResponse('Project not found', 404)
  }

  // Check permissions
  const canView = 
    req.user.role === 'government' ||
    req.user.role === 'auditor' ||
    (req.user.role === 'producer' && project.producer.toString() === req.user.id)

  if (!canView) {
    throw new ErrorResponse('Not authorized to view audit trail', 403)
  }

  const auditTrail = await Audit.getAuditTrail('project', req.params.id, 100)

  res.json({
    success: true,
    data: {
      auditTrail
    }
  })
})
