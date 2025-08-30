import mongoose from 'mongoose'
import mongoosePaginate from 'mongoose-paginate-v2'

const projectSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Blockchain Information
  projectId: {
    type: String,
    required: [true, 'Blockchain project ID is required'],
    unique: true
  },
  
  contractAddress: {
    type: String,
    required: [true, 'Contract address is required'],
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid contract address']
  },
  
  // Participants
  producer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Producer is required']
  },
  
  producerWalletAddress: {
    type: String,
    required: [true, 'Producer wallet address is required'],
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid Ethereum address']
  },
  
  government: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Government entity is required']
  },
  
  auditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Project Details
  location: {
    address: String,
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    zipCode: String
  },
  
  capacity: {
    value: {
      type: Number,
      required: [true, 'Capacity value is required'],
      min: [0, 'Capacity must be positive']
    },
    unit: {
      type: String,
      required: [true, 'Capacity unit is required'],
      enum: ['MW', 'GW', 'kW', 'tons/day', 'kg/day']
    }
  },
  
  technology: {
    type: String,
    enum: [
      'Electrolysis',
      'Steam Methane Reforming',
      'Biomass Gasification',
      'Solar Thermochemical',
      'Other'
    ],
    default: 'Electrolysis'
  },
  
  // Financial Information
  totalSubsidy: {
    type: Number,
    required: [true, 'Total subsidy amount is required'],
    min: [0, 'Subsidy amount must be positive']
  },
  
  released: {
    type: Number,
    default: 0,
    min: [0, 'Released amount must be positive']
  },
  
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  
  // Timeline
  expectedStartDate: {
    type: Date,
    required: [true, 'Expected start date is required']
  },
  
  expectedEndDate: {
    type: Date,
    required: [true, 'Expected end date is required']
  },
  
  actualStartDate: Date,
  actualEndDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'completed', 'suspended', 'cancelled'],
    default: 'pending'
  },
  
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  approvalDate: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Progress Tracking
  milestoneCount: {
    type: Number,
    default: 0,
    min: [0, 'Milestone count must be positive']
  },
  
  completedMilestones: {
    type: Number,
    default: 0,
    min: [0, 'Completed milestones must be positive']
  },
  
  progressPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Progress percentage must be between 0 and 100'],
    max: [100, 'Progress percentage must be between 0 and 100']
  },
  
  // Environmental Impact
  environmentalBenefits: {
    co2Reduction: {
      type: Number,
      min: [0, 'CO2 reduction must be positive']
    },
    waterUsage: {
      type: Number,
      min: [0, 'Water usage must be positive']
    },
    renewableEnergyUsed: {
      type: Number,
      min: [0, 'Renewable energy percentage must be between 0 and 100'],
      max: [100, 'Renewable energy percentage must be between 0 and 100']
    }
  },
  
  // Documents
  documents: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['license', 'permit', 'certificate', 'report', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Compliance
  permits: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    documentUrl: String
  }],
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['milestone_due', 'payment_released', 'status_change', 'document_required'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes (projectId already has unique index)
projectSchema.index({ producer: 1 })
projectSchema.index({ government: 1 })
projectSchema.index({ status: 1 })
projectSchema.index({ approvalStatus: 1 })
projectSchema.index({ location: '2dsphere' })
projectSchema.index({ createdAt: -1 })
projectSchema.index({ expectedStartDate: 1 })
projectSchema.index({ expectedEndDate: 1 })

// Virtual for remaining subsidy
projectSchema.virtual('remainingSubsidy').get(function() {
  return this.totalSubsidy - this.released
})

// Virtual for days remaining
projectSchema.virtual('daysRemaining').get(function() {
  if (!this.expectedEndDate) return null
  const today = new Date()
  const timeDiff = this.expectedEndDate.getTime() - today.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
})

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (!this.expectedStartDate || !this.expectedEndDate) return null
  const timeDiff = this.expectedEndDate.getTime() - this.expectedStartDate.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
})

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Calculate progress percentage based on completed milestones
  if (this.milestoneCount > 0) {
    this.progressPercentage = Math.round((this.completedMilestones / this.milestoneCount) * 100)
  }
  
  // Update status based on progress
  if (this.progressPercentage === 100 && this.status === 'active') {
    this.status = 'completed'
    this.actualEndDate = new Date()
  }
  
  next()
})

// Method to add milestone
projectSchema.methods.addMilestone = function() {
  this.milestoneCount += 1
  return this.save()
}

// Method to complete milestone
projectSchema.methods.completeMilestone = function(amount = 0) {
  this.completedMilestones += 1
  this.released += amount
  return this.save()
}

// Method to update status
projectSchema.methods.updateStatus = function(newStatus, updatedBy) {
  const oldStatus = this.status
  this.status = newStatus
  
  // Add notification
  this.notifications.push({
    type: 'status_change',
    message: `Project status changed from ${oldStatus} to ${newStatus}`,
    createdAt: new Date()
  })
  
  return this.save()
}

// Method to get summary
projectSchema.methods.getSummary = function() {
  return {
    id: this._id,
    projectId: this.projectId,
    name: this.name,
    status: this.status,
    totalSubsidy: this.totalSubsidy,
    released: this.released,
    remainingSubsidy: this.remainingSubsidy,
    progressPercentage: this.progressPercentage,
    completedMilestones: this.completedMilestones,
    milestoneCount: this.milestoneCount,
    location: this.location,
    capacity: this.capacity,
    expectedEndDate: this.expectedEndDate,
    daysRemaining: this.daysRemaining
  }
}

// Static methods
projectSchema.statics.findByProducer = function(producerId) {
  return this.find({ producer: producerId, isActive: true })
    .populate('producer', 'name email walletAddress')
    .populate('government', 'name email')
    .sort({ createdAt: -1 })
}

projectSchema.statics.findByStatus = function(status) {
  return this.find({ status, isActive: true })
    .populate('producer', 'name email walletAddress')
    .populate('government', 'name email')
    .sort({ createdAt: -1 })
}

projectSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        totalSubsidy: { $sum: '$totalSubsidy' },
        totalReleased: { $sum: '$released' },
        activeProjects: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        completedProjects: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        avgProgress: { $avg: '$progressPercentage' }
      }
    }
  ])
  
  return stats[0] || {
    totalProjects: 0,
    totalSubsidy: 0,
    totalReleased: 0,
    activeProjects: 0,
    completedProjects: 0,
    avgProgress: 0
  }
}

// Add pagination plugin
projectSchema.plugin(mongoosePaginate)

export default mongoose.model('Project', projectSchema)
