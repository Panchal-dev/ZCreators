import { ErrorResponse } from '../utils/errorResponse.js'
import { Audit } from '../models/index.js'
import logger from '../utils/logger.js'

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error with details
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    } : 'Not authenticated'
  })

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = new ErrorResponse(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const value = err.keyValue[field]
    const message = `Duplicate value for ${field}: ${value}. Please use another value.`
    error = new ErrorResponse(message, 400)

    // Log duplicate key attempt
    if (req.user) {
      Audit.logSecurityEvent(
        'duplicate_key_violation',
        {
          userId: req.user._id,
          userEmail: req.user.email,
          role: req.user.role,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        `Duplicate key violation: ${field} = ${value}`,
        'low'
      ).catch(logErr => logger.error('Audit log error:', logErr))
    }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(error => error.message).join(', ')
    error = new ErrorResponse(message, 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = new ErrorResponse(message, 401)
    
    // Log invalid token attempt
    Audit.logSecurityEvent(
      'invalid_token_attempt',
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      `Invalid JWT token used to access ${req.originalUrl}`,
      'medium'
    ).catch(logErr => logger.error('Audit log error:', logErr))
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = new ErrorResponse(message, 401)
  }

  // Rate limit errors
  if (err.status === 429) {
    error = new ErrorResponse('Too many requests, please try again later', 429)
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ErrorResponse('File too large', 400)
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ErrorResponse('Unexpected field in file upload', 400)
  }

  // Database connection errors
  if (err.name === 'MongooseServerSelectionError') {
    error = new ErrorResponse('Database connection failed', 500)
    logger.error('Database connection error:', err)
  }

  // Network/timeout errors
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    error = new ErrorResponse('Service temporarily unavailable', 503)
  }

  // Blockchain/Web3 errors
  if (err.message && err.message.includes('revert')) {
    error = new ErrorResponse('Blockchain transaction failed: ' + err.message, 400)
  }

  // Log system errors for audit
  if (error.statusCode >= 500) {
    Audit.createAuditLog({
      eventType: 'system_error',
      actor: req.user ? {
        userId: req.user._id,
        userEmail: req.user.email,
        role: req.user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      } : {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        role: 'system'
      },
      resource: {
        type: 'system',
        name: 'Error Handler'
      },
      action: 'create',
      description: `System error: ${error.message}`,
      category: 'error',
      severity: 'high',
      request: {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        // Don't log sensitive data
        body: req.method === 'POST' || req.method === 'PUT' ? 
          Object.keys(req.body || {}).reduce((safe, key) => {
            if (!['password', 'token', 'secret'].some(sensitive => 
              key.toLowerCase().includes(sensitive))) {
              safe[key] = req.body[key]
            }
            return safe
          }, {}) : undefined
      },
      response: {
        status: error.statusCode,
        success: false,
        errorMessage: error.message
      }
    }).catch(logErr => logger.error('Audit log error:', logErr))
  }

  // Security-related errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    Audit.logSecurityEvent(
      'access_denied',
      {
        userId: req.user?._id,
        userEmail: req.user?.email,
        role: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      `Access denied: ${error.message} for ${req.method} ${req.originalUrl}`,
      'medium'
    ).catch(logErr => logger.error('Audit log error:', logErr))
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err
      })
    }
  })
}

export default errorHandler
