import { ErrorResponse } from '../utils/errorResponse.js'
import { Audit } from '../models/index.js'
import logger from '../utils/logger.js'

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error details
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.email : 'Anonymous'
  })

  // Log system error to audit
  if (req.user) {
    Audit.createAuditLog({
      eventType: 'system_error',
      actor: {
        userId: req.user.id,
        userEmail: req.user.email,
        role: req.user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      resource: {
        type: 'system',
        name: 'API Error'
      },
      action: 'read',
      description: `System error occurred: ${err.message}`,
      category: 'error',
      severity: 'high',
      request: {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        body: req.method !== 'GET' ? req.body : undefined
      },
      response: {
        status: error.statusCode || 500,
        success: false,
        errorMessage: err.message
      }
    }).catch(auditErr => logger.error('Audit logging failed:', auditErr))
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = new ErrorResponse(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered'
    error = new ErrorResponse(message, 400)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = new ErrorResponse(message, 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = new ErrorResponse(message, 401)
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = new ErrorResponse(message, 401)
  }

  // MongoDB connection errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    const message = 'Database connection error'
    error = new ErrorResponse(message, 500)
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = new ErrorResponse('Too many requests, please try again later', 429)
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ErrorResponse('File size too large', 400)
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ErrorResponse('Unexpected file field', 400)
  }

  // Network/timeout errors
  if (err.code === 'ECONNREFUSED') {
    error = new ErrorResponse('Service temporarily unavailable', 503)
  }

  if (err.code === 'ETIMEDOUT') {
    error = new ErrorResponse('Request timeout', 408)
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500
  const message = error.message || 'Server Error'

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ...(req.user && { userId: req.user.id })
  })
}

export default errorHandler
