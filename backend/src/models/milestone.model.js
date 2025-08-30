import mongoose from 'mongoose'
import mongoosePaginate from 'mongoose-paginate-v2'

const milestoneSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Project Reference
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference is required']
  },
  
  projectId: {
    type: String,
    required: [true, 'Project blockchain ID is required']
  },
  
  // Blockchain Information
  milestoneId: {
    type: String,
    required: [true, 'Blockchain milestone ID is required'],
    unique: true
  },
  
  blockchainTxHash: {
    type: String,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Please provide a valid transaction hash']
  },
  
  // Milestone Details
  sequenceNumber: {
    type: Number,
    required: [true, 'Sequence number is required'],
    min: [1, 'Sequence number must be positive']
  },
  
  category: {
    type: String,
    enum: [
      'Planning & Design',
      'Permits & Approvals',
      'Construction',
      'Equipment Installation',
      'Testing & Commissioning',
      'Production Start',
      'Performance Milestone',
      'Final Completion'
    ],
    required: [true, 'Category is required']
  },
  
  // Timeline
  plannedStartDate: {
    type: Date,
    required: [true, 'Planned start date is required']
  },
  
  plannedEndDate: {
    type: Date,
    required: [true, 'Planned end date is required']
  },
  
  actualStartDate: Date,
  actualEndDate: Date,
  
  // Financial Information
  subsidyAmount: {
    type: Number,
    required: [true, 'Subsidy amount is required'],
    min: [0, 'Subsidy amount must be positive']
  },
  
  released: {
    type: Boolean,
    default: false
  },
  
  releaseDate: Date,
  
  releaseTxHash: {
    type: String,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Please provide a valid transaction hash']
  },
  
  // Status and Progress
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'],
    default: 'pending'
  },
  
  completionPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Completion percentage must be between 0 and 100'],
    max: [100, 'Completion percentage must be between 0 and 100']
  },
  
  // Requirements and Deliverables
  requirements: [{
    description: {
      type: String,
      required: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedDate: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  deliverables: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['document', 'certificate', 'report', 'video', 'image', 'other'],
      required: true
    },
    url: String,
    isSubmitted: {
      type: Boolean,
      default: false
    },
    submittedDate: Date,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Verification and Approval
  verification: {
    isRequired: {
      type: Boolean,
      default: true
    },
    method: {
      type: String,
      enum: ['document_review', 'site_visit', 'remote_monitoring', 'third_party_audit'],
      default: 'document_review'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationDate: Date,
    verificationComments: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  
  approval: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalDate: Date,
    approvalComments: String,
    isApproved: {
      type: Boolean,
      default: false
    }
  },
  
  // Technical Specifications
  technicalSpecs: {
    performanceTargets: [{
      parameter: String,
      targetValue: Number,
      actualValue: Number,
      unit: String,
      achieved: Boolean
    }],
    qualityStandards: [String],
    complianceChecks: [{
      regulation: String,
      status: {
        type: String,
        enum: ['pending', 'compliant', 'non_compliant']
      },
      verifiedDate: Date
    }]
  },
  
  // Oracle Data
  oracleData: {
    dataSource: String,
    lastUpdated: Date,
    verificationHash: String,
    data: mongoose.Schema.Types.Mixed
  },
  
  // Comments and Updates
  updates: [{
    message: {
      type: String,
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['progress', 'issue', 'resolution', 'general'],
      default: 'general'
    }
  }],
  
  // Risk Management
  risks: [{
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    mitigation: String,
    status: {
      type: String,
      enum: ['open', 'mitigated', 'closed']
    }
  }],
  
  // Dependencies
  dependencies: [{
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone'
    },
    type: {
      type: String,
      enum: ['finish_to_start', 'start_to_start', 'finish_to_finish']
    },
    description: String
  }],
  
  // Metadata
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  tags: [String],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes (milestoneId already has unique index)
milestoneSchema.index({ project: 1, sequenceNumber: 1 })
milestoneSchema.index({ status: 1 })
milestoneSchema.index({ plannedEndDate: 1 })
milestoneSchema.index({ createdAt: -1 })

// Virtual for days until due
milestoneSchema.virtual('daysUntilDue').get(function() {
  if (!this.plannedEndDate) return null
  const today = new Date()
  const timeDiff = this.plannedEndDate.getTime() - today.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
})

// Virtual for duration
milestoneSchema.virtual('plannedDuration').get(function() {
  if (!this.plannedStartDate || !this.plannedEndDate) return null
  const timeDiff = this.plannedEndDate.getTime() - this.plannedStartDate.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
})

// Virtual for actual duration
milestoneSchema.virtual('actualDuration').get(function() {
  if (!this.actualStartDate || !this.actualEndDate) return null
  const timeDiff = this.actualEndDate.getTime() - this.actualStartDate.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
})

// Virtual for completion status
milestoneSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed') return false
  const today = new Date()
  return this.plannedEndDate < today
})

// Pre-save middleware
milestoneSchema.pre('save', function(next) {
  // Update status based on completion percentage
  if (this.completionPercentage === 100 && this.status !== 'completed') {
    this.status = 'completed'
    this.actualEndDate = new Date()
  }
  
  // Check if overdue
  if (this.isOverdue && this.status === 'in_progress') {
    this.status = 'overdue'
  }
  
  // Calculate completion percentage based on requirements
  if (this.requirements && this.requirements.length > 0) {
    const completedRequirements = this.requirements.filter(req => req.isCompleted).length
    this.completionPercentage = Math.round((completedRequirements / this.requirements.length) * 100)
  }
  
  next()
})

// Method to start milestone
milestoneSchema.methods.start = function(startedBy) {
  this.status = 'in_progress'
  this.actualStartDate = new Date()
  
  this.updates.push({
    message: 'Milestone started',
    updatedBy: startedBy,
    type: 'progress'
  })
  
  return this.save()
}

// Method to complete milestone
milestoneSchema.methods.complete = function(completedBy) {
  this.status = 'completed'
  this.completionPercentage = 100
  this.actualEndDate = new Date()
  
  this.updates.push({
    message: 'Milestone completed',
    updatedBy: completedBy,
    type: 'progress'
  })
  
  return this.save()
}

// Method to verify milestone
milestoneSchema.methods.verify = function(verifiedBy, comments = '') {
  this.verification.isVerified = true
  this.verification.verifiedBy = verifiedBy
  this.verification.verificationDate = new Date()
  this.verification.verificationComments = comments
  
  this.updates.push({
    message: `Milestone verified${comments ? ': ' + comments : ''}`,
    updatedBy: verifiedBy,
    type: 'progress'
  })
  
  return this.save()
}

// Method to approve milestone
milestoneSchema.methods.approve = function(approvedBy, comments = '') {
  this.approval.isApproved = true
  this.approval.approvedBy = approvedBy
  this.approval.approvalDate = new Date()
  this.approval.approvalComments = comments
  
  this.updates.push({
    message: `Milestone approved${comments ? ': ' + comments : ''}`,
    updatedBy: approvedBy,
    type: 'progress'
  })
  
  return this.save()
}

// Method to release subsidy
milestoneSchema.methods.releaseSubsidy = function(txHash) {
  this.released = true
  this.releaseDate = new Date()
  this.releaseTxHash = txHash
  
  return this.save()
}

// Method to add update
milestoneSchema.methods.addUpdate = function(message, updatedBy, type = 'general') {
  this.updates.push({
    message,
    updatedBy,
    type,
    timestamp: new Date()
  })
  
  return this.save()
}

// Static methods
milestoneSchema.statics.findByProject = function(projectId) {
  return this.find({ project: projectId, isActive: true })
    .sort({ sequenceNumber: 1 })
    .populate('verification.verifiedBy', 'name email')
    .populate('approval.approvedBy', 'name email')
}

milestoneSchema.statics.findOverdue = function() {
  const today = new Date()
  return this.find({
    plannedEndDate: { $lt: today },
    status: { $in: ['pending', 'in_progress'] },
    isActive: true
  })
    .populate('project', 'name producer')
    .sort({ plannedEndDate: 1 })
}

milestoneSchema.statics.findUpcoming = function(days = 7) {
  const today = new Date()
  const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000))
  
  return this.find({
    plannedEndDate: { $gte: today, $lte: futureDate },
    status: { $in: ['pending', 'in_progress'] },
    isActive: true
  })
    .populate('project', 'name producer')
    .sort({ plannedEndDate: 1 })
}

milestoneSchema.statics.getStatistics = async function(projectId = null) {
  const matchCondition = { isActive: true }
  if (projectId) {
    matchCondition.project = mongoose.Types.ObjectId(projectId)
  }
  
  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalMilestones: { $sum: 1 },
        completedMilestones: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        overdueMilestones: {
          $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
        },
        totalSubsidy: { $sum: '$subsidyAmount' },
        releasedSubsidy: {
          $sum: { $cond: ['$released', '$subsidyAmount', 0] }
        },
        avgCompletion: { $avg: '$completionPercentage' }
      }
    }
  ])
  
  return stats[0] || {
    totalMilestones: 0,
    completedMilestones: 0,
    overdueMilestones: 0,
    totalSubsidy: 0,
    releasedSubsidy: 0,
    avgCompletion: 0
  }
}

// Add pagination plugin
milestoneSchema.plugin(mongoosePaginate)

export default mongoose.model('Milestone', milestoneSchema)
