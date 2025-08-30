import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import { Audit } from '../models/index.js'
import logger from '../utils/logger.js'

// Protect routes - check for valid JWT token
export const protect = async (req, res, next) => {
  let token

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Get user from token
    const user = await User.findById(decoded.id)

    if (!user) {
      return next(new ErrorResponse('No user found with this token', 401))
    }

    // Check if user is active
    if (!user.isActive) {
      // Log security event
      await Audit.logSecurityEvent(
        'inactive_user_access_attempt',
        {
          userId: user._id,
          userEmail: user.email,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        `Inactive user attempted to access protected route: ${user.email}`,
        'high'
      )

      return next(new ErrorResponse('Account is deactivated', 403))
    }

    // Check if password was changed after the token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return next(new ErrorResponse('Password was changed recently. Please login again.', 401))
    }

    // Set user in request object
    req.user = user
    next()
  } catch (error) {
    // Log failed authentication attempt
    await Audit.logSecurityEvent(
      'invalid_token_attempt',
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      `Invalid token used to access protected route: ${req.originalUrl}`,
      'medium'
    )

    logger.error('Token verification error:', error.message)
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }
}

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401))
    }

    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempt
      Audit.logSecurityEvent(
        'unauthorized_access_attempt',
        {
          userId: req.user._id,
          userEmail: req.user.email,
          role: req.user.role,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        `User ${req.user.email} (${req.user.role}) attempted to access ${req.originalUrl} requiring roles: ${roles.join(', ')}`,
        'high'
      ).catch(err => logger.error('Audit log error:', err))

      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      )
    }

    next()
  }
}

// Check if user owns the resource or has appropriate permissions
export const checkResourceOwnership = (resourceModel, ownerField = 'user') => {
  return async (req, res, next) => {
    try {
      const resource = await resourceModel.findById(req.params.id)

      if (!resource) {
        return next(new ErrorResponse('Resource not found', 404))
      }

      // Allow access if user is government or auditor (system-wide access)
      if (['government', 'auditor'].includes(req.user.role)) {
        req.resource = resource
        return next()
      }

      // Check if user owns the resource
      const ownerId = resource[ownerField]?.toString() || resource[ownerField]

      if (ownerId !== req.user._id.toString()) {
        // Log unauthorized access attempt
        await Audit.logSecurityEvent(
          'unauthorized_resource_access',
          {
            userId: req.user._id,
            userEmail: req.user.email,
            role: req.user.role,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          `User attempted to access unauthorized resource: ${resourceModel.modelName} ${req.params.id}`,
          'high'
        )

        return next(new ErrorResponse('Not authorized to access this resource', 403))
      }

      req.resource = resource
      next()
    } catch (error) {
      logger.error('Resource ownership check error:', error)
      return next(new ErrorResponse('Error checking resource ownership', 500))
    }
  }
}

// Rate limiting middleware for authentication endpoints
export const authRateLimit = (windowMs = 15 * 60 * 1000, maxAttempts = 5) => {
  const attempts = new Map()

  return (req, res, next) => {
    const key = `${req.ip}-${req.originalUrl}`
    const now = Date.now()
    
    // Clean old entries
    for (const [mapKey, data] of attempts.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(mapKey)
      }
    }

    const userAttempts = attempts.get(key)

    if (!userAttempts) {
      attempts.set(key, { count: 1, firstAttempt: now })
      return next()
    }

    if (now - userAttempts.firstAttempt > windowMs) {
      attempts.set(key, { count: 1, firstAttempt: now })
      return next()
    }

    if (userAttempts.count >= maxAttempts) {
      // Log rate limit exceeded
      Audit.logSecurityEvent(
        'rate_limit_exceeded',
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        `Rate limit exceeded for ${req.originalUrl} from IP: ${req.ip}`,
        'high'
      ).catch(err => logger.error('Audit log error:', err))

      return next(new ErrorResponse(`Too many attempts. Try again in ${Math.ceil(windowMs / 60000)} minutes.`, 429))
    }

    userAttempts.count++
    next()
  }
}

// Validate wallet address ownership
export const validateWalletOwnership = async (req, res, next) => {
  const { walletAddress, signature, message } = req.body

  if (!walletAddress) {
    return next()
  }

  try {
    // Import ethers for signature verification
    const { ethers } = await import('ethers')
    
    if (signature && message) {
      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(message, signature)
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return next(new ErrorResponse('Wallet signature verification failed', 400))
      }
    }

    // Check if wallet is already in use by another user
    const existingUser = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      _id: { $ne: req.user?._id }
    })

    if (existingUser) {
      return next(new ErrorResponse('Wallet address already in use', 400))
    }

    next()
  } catch (error) {
    logger.error('Wallet validation error:', error)
    return next(new ErrorResponse('Wallet validation failed', 400))
  }
}

// Validate KYC status for specific operations
export const requireKYC = (status = 'approved') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401))
    }

    if (req.user.kycStatus !== status) {
      // Log KYC requirement not met
      Audit.createAuditLog({
        eventType: 'kyc_requirement_failed',
        actor: {
          userId: req.user._id,
          userEmail: req.user.email,
          role: req.user.role,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        resource: {
          type: 'system',
          name: 'KYC Validation'
        },
        action: 'read',
        description: `KYC requirement not met. Current status: ${req.user.kycStatus}, required: ${status}`,
        category: 'compliance',
        severity: 'medium'
      }).catch(err => logger.error('Audit log error:', err))

      return next(new ErrorResponse(`KYC ${status} status required for this operation`, 403))
    }

    next()
  }
}

// Check 2FA requirement for sensitive operations
export const require2FA = async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorResponse('User not authenticated', 401))
  }

  // Skip 2FA check if user doesn't have it enabled
  if (!req.user.twoFactorEnabled) {
    return next()
  }

  const { twoFactorCode } = req.body

  if (!twoFactorCode) {
    return next(new ErrorResponse('2FA code required', 400))
  }

  try {
    // Verify 2FA code (implement with speakeasy or similar library)
    const isValid = await req.user.verify2FA(twoFactorCode)

    if (!isValid) {
      // Log failed 2FA attempt
      await Audit.logSecurityEvent(
        'two_factor_failed',
        {
          userId: req.user._id,
          userEmail: req.user.email,
          role: req.user.role,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        `Failed 2FA verification for ${req.user.email}`,
        'high'
      )

      return next(new ErrorResponse('Invalid 2FA code', 400))
    }

    next()
  } catch (error) {
    logger.error('2FA verification error:', error)
    return next(new ErrorResponse('2FA verification failed', 500))
  }
}
