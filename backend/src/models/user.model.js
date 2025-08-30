import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoosePaginate from 'mongoose-paginate-v2'

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'], // Always require password
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  
  // Blockchain Information
  walletAddress: {
    type: String,
    required: false, // Made optional - can be added later when user connects wallet
    unique: true,
    sparse: true, // Allow multiple null/undefined values
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid Ethereum address']
  },
  
  // Role and Permissions
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['government', 'producer', 'auditor', 'oracle'],
      message: 'Role must be government, producer, auditor, or oracle'
    }
  },
  
  permissions: [{
    type: String,
    enum: [
      'create_project',
      'update_project', 
      'delete_project',
      'verify_milestone',
      'release_payment',
      'view_audit_logs',
      'export_data',
      'manage_users'
    ]
  }],
  
  // Organization Information
  organization: {
    name: String,
    type: {
      type: String,
      enum: ['government', 'private', 'ngo', 'research']
    },
    registrationNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },
  
  // Contact Information
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  
  // Bank Details (encrypted)
  bankDetails: {
    accountNumber: {
      type: String,
      select: false // Sensitive information
    },
    routingNumber: {
      type: String,
      select: false
    },
    bankName: String,
    branchCode: String,
    ifscCode: String
  },
  
  // Profile Information
  avatar: {
    url: String,
    publicId: String
  },
  
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  // Status and Settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  
  // Security
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: Date,
  
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  // Two-Factor Authentication
  twoFactorSecret: {
    type: String,
    select: false
  },
  
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Metadata
  metadata: {
    registrationIP: String,
    userAgent: String,
    referralCode: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes (only non-unique ones needed - unique fields already have indexes)
userSchema.index({ role: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ createdAt: -1 })

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

// Pre-save middleware to hash password and handle wallet address
userSchema.pre('save', async function(next) {
  // Handle empty wallet address - convert empty string to undefined to avoid unique constraint issues
  if (this.walletAddress === '') {
    this.walletAddress = undefined
  }
  
  // Only hash password if it has been modified
  if (!this.isModified('password')) return next()
  
  // Hash password with salt rounds
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

// Alias for compatibility
userSchema.methods.matchPassword = async function(candidatePassword) {
  return this.comparePassword(candidatePassword)
}

// Method to generate JWT token
userSchema.methods.generateJWT = function() {
  return jwt.sign(
    this.getTokenPayload(),
    process.env.JWT_SECRET || '43519750-e783-4454-95e5-0111e6da0164',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  )
}

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    })
  }
  
  const updates = { $inc: { loginAttempts: 1 } }
  
  // Lock account after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 } // 2 hours
  }
  
  return this.updateOne(updates)
}

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  })
}

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex')
  
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex')
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  
  return token
}

// Method to generate password reset token
userSchema.methods.generateResetPasswordToken = function() {
  const token = crypto.randomBytes(32).toString('hex')
  
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex')
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000 // 10 minutes
  
  return token
}

// Method to generate auth token payload
userSchema.methods.getTokenPayload = function() {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    walletAddress: this.walletAddress,
    permissions: this.permissions,
    isVerified: this.isVerified
  }
}

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    walletAddress: this.walletAddress,
    organization: this.organization,
    avatar: this.avatar,
    bio: this.bio,
    isVerified: this.isVerified,
    kycStatus: this.kycStatus,
    createdAt: this.createdAt
  }
}

// Static method to find by wallet address
userSchema.statics.findByWalletAddress = function(address) {
  return this.findOne({ walletAddress: address.toLowerCase() })
}

// Static method to find by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true })
}

// Add pagination plugin
userSchema.plugin(mongoosePaginate)

export default mongoose.model('User', userSchema)
