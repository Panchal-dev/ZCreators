import mongoose from 'mongoose'
import mongoosePaginate from 'mongoose-paginate-v2'

const auditSchema = new mongoose.Schema({
  // Basic Information
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: [
      'user_login',
      'user_logout',
      'user_registration',
      'user_profile_update',
      'project_created',
      'project_updated',
      'project_status_changed',
      'milestone_created',
      'milestone_updated',
      'milestone_completed',
      'subsidy_released',
      'payment_processed',
      'document_uploaded',
      'document_accessed',
      'verification_completed',
      'approval_granted',
      'approval_rejected',
      'blockchain_transaction',
      'oracle_data_update',
      'system_error',
      'security_alert',
      'access_denied',
      'authentication_failed',
      'authorization_failed',
      'data_export',
      'admin_action'
    ]
  },
  
  // Actor Information
  actor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userEmail: String,
    walletAddress: {
      type: String,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid Ethereum address']
    },
    role: {
      type: String,
      enum: ['government', 'producer', 'auditor', 'admin', 'system']
    },
    ipAddress: String,
    userAgent: String
  },
  
  // Target Resource
  resource: {
    type: {
      type: String,
      enum: ['user', 'project', 'milestone', 'payment', 'document', 'system', 'blockchain'],
      required: [true, 'Resource type is required']
    },
    id: String, // Resource ID (could be MongoDB ObjectId or blockchain ID)
    name: String, // Human readable name of the resource
    details: mongoose.Schema.Types.Mixed // Additional resource-specific data
  },
  
  // Action Details
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'create',
      'read',
      'update',
      'delete',
      'approve',
      'reject',
      'release',
      'verify',
      'upload',
      'download',
      'login',
      'logout',
      'register',
      'transfer',
      'mint',
      'burn',
      'lock',
      'unlock'
    ]
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Request Information
  request: {
    method: String, // HTTP method (GET, POST, PUT, DELETE)
    url: String,    // Request URL
    params: mongoose.Schema.Types.Mixed, // Request parameters
    body: mongoose.Schema.Types.Mixed,   // Request body (sensitive data should be filtered)
    headers: mongoose.Schema.Types.Mixed // Relevant headers
  },
  
  // Response Information
  response: {
    status: Number, // HTTP status code
    success: Boolean,
    errorMessage: String,
    data: mongoose.Schema.Types.Mixed // Response data (sensitive data should be filtered)
  },
  
  // Blockchain Information
  blockchain: {
    network: {
      type: String,
      enum: ['ethereum', 'polygon', 'bsc', 'localhost']
    },
    transactionHash: {
      type: String,
      match: [/^0x[a-fA-F0-9]{64}$/, 'Please provide a valid transaction hash']
    },
    blockNumber: Number,
    contractAddress: {
      type: String,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid contract address']
    },
    gasUsed: String,
    gasPrice: String,
    functionName: String,
    eventLogs: [mongoose.Schema.Types.Mixed]
  },
  
  // Financial Information
  financial: {
    amount: Number,
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'ETH', 'MATIC']
    },
    fromAddress: String,
    toAddress: String,
    fees: Number
  },
  
  // Severity and Category
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  category: {
    type: String,
    enum: [
      'authentication',
      'authorization',
      'data_access',
      'data_modification',
      'financial',
      'system',
      'security',
      'compliance',
      'performance',
      'error'
    ],
    required: [true, 'Category is required']
  },
  
  // Metadata
  sessionId: String,
  correlationId: String, // For tracking related events
  parentAuditId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Audit'
  },
  
  tags: [String],
  
  // Additional Context
  context: {
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development'
    },
    version: String,
    feature: String,
    module: String
  },
  
  // Privacy and Compliance
  dataClassification: {
    type: String,
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal'
  },
  
  personalDataInvolved: {
    type: Boolean,
    default: false
  },
  
  retentionPeriod: {
    type: Number,
    default: 2555 // 7 years in days for financial records
  },
  
  // Review and Investigation
  reviewed: {
    type: Boolean,
    default: false
  },
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  reviewedAt: Date,
  
  flagged: {
    type: Boolean,
    default: false
  },
  
  flagReason: String,
  
  // Archival
  archived: {
    type: Boolean,
    default: false
  },
  
  archivedAt: Date,
  
  // Performance Metrics
  duration: Number, // Operation duration in milliseconds
  
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // Using custom timestamp field
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
auditSchema.index({ timestamp: -1 })
auditSchema.index({ 'actor.userId': 1, timestamp: -1 })
auditSchema.index({ eventType: 1, timestamp: -1 })
auditSchema.index({ category: 1, timestamp: -1 })
auditSchema.index({ severity: 1, timestamp: -1 })
auditSchema.index({ 'resource.type': 1, 'resource.id': 1 })
auditSchema.index({ 'blockchain.transactionHash': 1 })
auditSchema.index({ correlationId: 1 })
auditSchema.index({ flagged: 1 })
auditSchema.index({ reviewed: 1 })

// TTL index for automatic deletion based on retention period
auditSchema.index(
  { timestamp: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { archived: true }
  }
)

// Virtual for formatted timestamp
auditSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString()
})

// Virtual for time ago
auditSchema.virtual('timeAgo').get(function() {
  const now = new Date()
  const diff = now - this.timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} days ago`
  if (hours > 0) return `${hours} hours ago`
  if (minutes > 0) return `${minutes} minutes ago`
  return 'Just now'
})

// Pre-save middleware
auditSchema.pre('save', function(next) {
  // Set expiration date based on retention period
  if (this.retentionPeriod && !this.expireAt) {
    const expirationDate = new Date(this.timestamp)
    expirationDate.setDate(expirationDate.getDate() + this.retentionPeriod)
    this.expireAt = expirationDate
  }
  
  // Auto-flag critical events
  if (this.severity === 'critical' || this.category === 'security') {
    this.flagged = true
    this.flagReason = 'Auto-flagged due to critical severity or security category'
  }
  
  next()
})

// Static methods
auditSchema.statics.createAuditLog = function(auditData) {
  const audit = new this(auditData)
  return audit.save()
}

auditSchema.statics.logUserAction = function(userId, action, resource, details = {}) {
  return this.createAuditLog({
    eventType: `${resource.type}_${action}`,
    actor: { userId },
    resource,
    action,
    description: `User ${action}d ${resource.type}: ${resource.name || resource.id}`,
    category: 'data_access',
    ...details
  })
}

auditSchema.statics.logBlockchainTransaction = function(txHash, contractAddress, functionName, actor, details = {}) {
  return this.createAuditLog({
    eventType: 'blockchain_transaction',
    actor,
    resource: {
      type: 'blockchain',
      id: txHash,
      name: functionName
    },
    action: 'transfer',
    description: `Blockchain transaction executed: ${functionName}`,
    blockchain: {
      transactionHash: txHash,
      contractAddress,
      functionName,
      ...details.blockchain
    },
    category: 'financial',
    ...details
  })
}

auditSchema.statics.logSecurityEvent = function(eventType, actor, description, severity = 'high') {
  return this.createAuditLog({
    eventType,
    actor,
    resource: {
      type: 'system',
      name: 'Security System'
    },
    action: 'read',
    description,
    category: 'security',
    severity
  })
}

auditSchema.statics.getAuditTrail = function(resourceType, resourceId, limit = 50) {
  return this.find({
    'resource.type': resourceType,
    'resource.id': resourceId
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('actor.userId', 'name email')
    .populate('reviewedBy', 'name email')
}

auditSchema.statics.getSecurityEvents = function(startDate, endDate, severity = 'high') {
  const query = {
    category: 'security',
    timestamp: {
      $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default 30 days
      $lte: endDate || new Date()
    }
  }
  
  if (severity) {
    query.severity = { $gte: severity }
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .populate('actor.userId', 'name email')
}

auditSchema.statics.getUserActivity = function(userId, limit = 100) {
  return this.find({ 'actor.userId': userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('eventType action resource description timestamp')
}

auditSchema.statics.getStatistics = async function(startDate, endDate) {
  const matchCondition = {
    timestamp: {
      $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      $lte: endDate || new Date()
    }
  }
  
  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        securityEvents: {
          $sum: { $cond: [{ $eq: ['$category', 'security'] }, 1, 0] }
        },
        criticalEvents: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        flaggedEvents: {
          $sum: { $cond: ['$flagged', 1, 0] }
        },
        blockchainTransactions: {
          $sum: { $cond: [{ $eq: ['$eventType', 'blockchain_transaction'] }, 1, 0] }
        }
      }
    }
  ])
  
  return stats[0] || {
    totalEvents: 0,
    securityEvents: 0,
    criticalEvents: 0,
    flaggedEvents: 0,
    blockchainTransactions: 0
  }
}

// Method to flag for review
auditSchema.methods.flagForReview = function(reason, flaggedBy) {
  this.flagged = true
  this.flagReason = reason
  this.reviewedBy = flaggedBy
  return this.save()
}

// Method to mark as reviewed
auditSchema.methods.markAsReviewed = function(reviewedBy) {
  this.reviewed = true
  this.reviewedBy = reviewedBy
  this.reviewedAt = new Date()
  return this.save()
}

// Method to archive
auditSchema.methods.archive = function() {
  this.archived = true
  this.archivedAt = new Date()
  return this.save()
}

// Add pagination plugin
auditSchema.plugin(mongoosePaginate)

export default mongoose.model('Audit', auditSchema)
