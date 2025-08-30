import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from '../models/index.js'
import { Audit } from '../models/index.js'
import logger from '../utils/logger.js'
import { sendEmail } from '../utils/email.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    walletAddress,
    organization,
    phoneNumber,
    address
  } = req.body

  // Check if user already exists
  let existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new ErrorResponse('User already exists with this email', 400)
  }

  // Check if wallet address is already in use
  if (walletAddress) {
    existingUser = await User.findOne({ walletAddress })
    if (existingUser) {
      throw new ErrorResponse('Wallet address already in use', 400)
    }
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    walletAddress,
    organization,
    phoneNumber,
    address,
    profile: {
      organization,
      phoneNumber,
      address
    }
  })

  // Generate email verification token
  const verificationToken = user.generateEmailVerificationToken()
  await user.save()

  // Log audit event
  await Audit.createAuditLog({
    eventType: 'user_registration',
    actor: {
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'user',
      id: user._id.toString(),
      name: user.name
    },
    action: 'create',
    description: `New user registered: ${user.name} (${user.email})`,
    category: 'authentication',
    severity: 'low'
  })

  // Send verification email (implement email service)
  try {
    await sendEmail({
      to: user.email,
      subject: 'Email Verification - Green Hydrogen Platform',
      html: `
        <h2>Welcome to Green Hydrogen Platform!</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${process.env.CLIENT_URL}/verify-email/${verificationToken}">Verify Email</a>
        <p>This link will expire in 1 hour.</p>
      `
    })
  } catch (error) {
    logger.error('Email sending failed:', error)
    // Don't throw error, just log it
  }

  // Generate JWT token
  const token = user.generateJWT()

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email for verification.',
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        isEmailVerified: user.isEmailVerified,
        kycStatus: user.kycStatus
      }
    }
  })
})

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Validate email and password
  if (!email || !password) {
    throw new ErrorResponse('Please provide email and password', 400)
  }

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password')
  
  if (!user) {
    // Log failed login attempt
    await Audit.logSecurityEvent(
      'user_login',
      {
        userEmail: email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      `Failed login attempt for non-existent email: ${email}`,
      'medium'
    )
    
    throw new ErrorResponse('Invalid credentials', 401)
  }

  // Check if account is locked
  if (user.accountLocked && user.lockUntil > Date.now()) {
    const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000)
    throw new ErrorResponse(`Account locked. Try again in ${remainingTime} minutes`, 423)
  }

  // Check password
  const isMatch = await user.matchPassword(password)

  if (!isMatch) {
    // Increment failed attempts
    await user.incrementLoginAttempts()
    
    // Log failed login attempt
    await Audit.logSecurityEvent(
      'user_login',
      {
        userId: user._id,
        userEmail: user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      `Failed login attempt: Invalid password for ${user.email}`,
      'medium'
    )
    
    throw new ErrorResponse('Invalid credentials', 401)
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ErrorResponse('Account is deactivated. Please contact support.', 403)
  }

  // Reset failed login attempts on successful login
  if (user.loginAttempts > 0) {
    await User.updateOne(
      { _id: user._id },
      {
        $unset: {
          loginAttempts: 1,
          lockUntil: 1
        }
      }
    )
  }

  // Update last login
  user.lastLogin = new Date()
  user.loginCount += 1
  await user.save()

  // Log successful login
  await Audit.createAuditLog({
    eventType: 'user_login',
    actor: {
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'user',
      id: user._id.toString(),
      name: user.name
    },
    action: 'login',
    description: `User logged in: ${user.email}`,
    category: 'authentication',
    severity: 'low'
  })

  // Generate JWT token
  const token = user.generateJWT()

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        isEmailVerified: user.isEmailVerified,
        kycStatus: user.kycStatus,
        lastLogin: user.lastLogin
      }
    }
  })
})

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        isEmailVerified: user.isEmailVerified,
        kycStatus: user.kycStatus,
        profile: user.profile,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      }
    }
  })
})

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    phoneNumber,
    organization,
    address,
    bio,
    website,
    linkedin
  } = req.body

  const user = await User.findById(req.user.id)

  // Update fields
  if (name) user.name = name
  if (phoneNumber) user.phoneNumber = phoneNumber
  if (organization) user.profile.organization = organization
  if (address) user.profile.address = address
  if (bio) user.profile.bio = bio
  if (website) user.profile.website = website
  if (linkedin) user.profile.linkedin = linkedin

  await user.save()

  // Log audit event
  await Audit.logUserAction(
    user._id,
    'update',
    {
      type: 'user',
      id: user._id.toString(),
      name: user.name
    },
    {
      description: 'User profile updated',
      category: 'data_modification'
    }
  )

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        profile: user.profile
      }
    }
  })
})

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  // Get user with password
  const user = await User.findById(req.user.id).select('+password')

  // Check current password
  const isMatch = await user.matchPassword(currentPassword)
  if (!isMatch) {
    throw new ErrorResponse('Current password is incorrect', 400)
  }

  // Update password
  user.password = newPassword
  user.passwordChangedAt = new Date()
  await user.save()

  // Log security event
  await Audit.logSecurityEvent(
    'password_change',
    {
      userId: user._id,
      userEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    `Password changed for user: ${user.email}`,
    'medium'
  )

  res.json({
    success: true,
    message: 'Password changed successfully'
  })
})

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  const user = await User.findOne({ email })

  if (!user) {
    throw new ErrorResponse('User not found with this email', 404)
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken()
  await user.save()

  // Create reset URL
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`

  // Send email
  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    })

    // Log security event
    await Audit.logSecurityEvent(
      'password_reset_request',
      {
        userId: user._id,
        userEmail: user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      `Password reset requested for user: ${user.email}`,
      'low'
    )

    res.json({
      success: true,
      message: 'Password reset email sent'
    })
  } catch (error) {
    user.passwordResetToken = undefined
    user.passwordResetExpire = undefined
    await user.save()

    logger.error('Email could not be sent:', error)
    throw new ErrorResponse('Email could not be sent', 500)
  }
})

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex')

  const user = await User.findOne({
    passwordResetToken: resetPasswordToken,
    passwordResetExpire: { $gt: Date.now() }
  })

  if (!user) {
    throw new ErrorResponse('Invalid or expired token', 400)
  }

  // Set new password
  user.password = password
  user.passwordResetToken = undefined
  user.passwordResetExpire = undefined
  user.passwordChangedAt = new Date()
  await user.save()

  // Log security event
  await Audit.logSecurityEvent(
    'password_reset_complete',
    {
      userId: user._id,
      userEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    `Password reset completed for user: ${user.email}`,
    'medium'
  )

  // Generate JWT token
  const token = user.generateJWT()

  res.json({
    success: true,
    message: 'Password reset successful',
    data: {
      token
    }
  })
})

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  // Get hashed token
  const verificationToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({
    emailVerificationToken: verificationToken,
    emailVerificationExpire: { $gt: Date.now() }
  })

  if (!user) {
    throw new ErrorResponse('Invalid or expired verification token', 400)
  }

  // Verify email
  user.isEmailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpire = undefined
  await user.save()

  // Log audit event
  await Audit.createAuditLog({
    eventType: 'email_verification',
    actor: {
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'user',
      id: user._id.toString(),
      name: user.name
    },
    action: 'verify',
    description: `Email verified for user: ${user.email}`,
    category: 'authentication',
    severity: 'low'
  })

  res.json({
    success: true,
    message: 'Email verified successfully'
  })
})

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // Log audit event
  await Audit.createAuditLog({
    eventType: 'user_logout',
    actor: {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    resource: {
      type: 'user',
      id: req.user.id,
      name: req.user.name
    },
    action: 'logout',
    description: `User logged out: ${req.user.email}`,
    category: 'authentication',
    severity: 'low'
  })

  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})
