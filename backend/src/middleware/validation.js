import Joi from 'joi'
import { ErrorResponse } from '../utils/errorResponse.js'

// Generic validation middleware
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false })
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ')
      return next(new ErrorResponse(errorMessage, 400))
    }
    
    next()
  }
}

// User registration validation
export const validateRegistration = validate(
  Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
      }),
    
    role: Joi.string().valid('government', 'producer', 'auditor').required().messages({
      'any.only': 'Role must be one of: government, producer, auditor',
      'any.required': 'Role is required'
    }),
    
    walletAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .allow(null)
      .messages({
        'string.pattern.base': 'Please provide a valid Ethereum wallet address'
      }),
    
    organization: Joi.string().min(2).max(200).messages({
      'string.min': 'Organization name must be at least 2 characters long',
      'string.max': 'Organization name cannot exceed 200 characters'
    }),
    
    phoneNumber: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    
    address: Joi.object({
      street: Joi.string().max(200),
      city: Joi.string().max(100),
      state: Joi.string().max(100),
      country: Joi.string().max(100),
      zipCode: Joi.string().max(20)
    })
  })
)

// User login validation
export const validateLogin = validate(
  Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  })
)

// Password change validation
export const validatePasswordChange = validate(
  Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required'
    }),
    
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'New password is required'
      })
  })
)

// Project creation validation
export const validateProject = validate(
  Joi.object({
    name: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Project name must be at least 2 characters long',
      'string.max': 'Project name cannot exceed 200 characters',
      'any.required': 'Project name is required'
    }),
    
    description: Joi.string().max(2000).messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),
    
    projectId: Joi.string().required().messages({
      'any.required': 'Blockchain project ID is required'
    }),
    
    contractAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid contract address',
        'any.required': 'Contract address is required'
      }),
    
    producer: Joi.string().required().messages({
      'any.required': 'Producer ID is required'
    }),
    
    location: Joi.object({
      address: Joi.string().max(500),
      city: Joi.string().required().messages({
        'any.required': 'City is required'
      }),
      state: Joi.string().required().messages({
        'any.required': 'State is required'
      }),
      country: Joi.string().default('India'),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      }),
      zipCode: Joi.string()
    }).required(),
    
    capacity: Joi.object({
      value: Joi.number().positive().required().messages({
        'number.positive': 'Capacity value must be positive',
        'any.required': 'Capacity value is required'
      }),
      unit: Joi.string().valid('MW', 'GW', 'kW', 'tons/day', 'kg/day').required().messages({
        'any.only': 'Capacity unit must be one of: MW, GW, kW, tons/day, kg/day',
        'any.required': 'Capacity unit is required'
      })
    }).required(),
    
    technology: Joi.string().valid(
      'Electrolysis',
      'Steam Methane Reforming',
      'Biomass Gasification',
      'Solar Thermochemical',
      'Other'
    ).default('Electrolysis'),
    
    totalSubsidy: Joi.number().positive().required().messages({
      'number.positive': 'Total subsidy amount must be positive',
      'any.required': 'Total subsidy amount is required'
    }),
    
    currency: Joi.string().valid('INR', 'USD', 'EUR').default('INR'),
    
    expectedStartDate: Joi.date().required().messages({
      'any.required': 'Expected start date is required'
    }),
    
    expectedEndDate: Joi.date().greater(Joi.ref('expectedStartDate')).required().messages({
      'date.greater': 'Expected end date must be after start date',
      'any.required': 'Expected end date is required'
    }),
    
    environmentalBenefits: Joi.object({
      co2Reduction: Joi.number().positive(),
      waterUsage: Joi.number().positive(),
      renewableEnergyUsed: Joi.number().min(0).max(100)
    }),
    
    tags: Joi.array().items(Joi.string().max(50)),
    
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
  })
)

// Milestone creation validation
export const validateMilestone = validate(
  Joi.object({
    title: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Milestone title must be at least 2 characters long',
      'string.max': 'Milestone title cannot exceed 200 characters',
      'any.required': 'Milestone title is required'
    }),
    
    description: Joi.string().max(1000).messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    
    milestoneId: Joi.string().required().messages({
      'any.required': 'Blockchain milestone ID is required'
    }),
    
    sequenceNumber: Joi.number().integer().positive().required().messages({
      'number.positive': 'Sequence number must be positive',
      'any.required': 'Sequence number is required'
    }),
    
    category: Joi.string().valid(
      'Planning & Design',
      'Permits & Approvals',
      'Construction',
      'Equipment Installation',
      'Testing & Commissioning',
      'Production Start',
      'Performance Milestone',
      'Final Completion'
    ).required().messages({
      'any.required': 'Category is required'
    }),
    
    plannedStartDate: Joi.date().required().messages({
      'any.required': 'Planned start date is required'
    }),
    
    plannedEndDate: Joi.date().greater(Joi.ref('plannedStartDate')).required().messages({
      'date.greater': 'Planned end date must be after start date',
      'any.required': 'Planned end date is required'
    }),
    
    subsidyAmount: Joi.number().positive().required().messages({
      'number.positive': 'Subsidy amount must be positive',
      'any.required': 'Subsidy amount is required'
    }),
    
    requirements: Joi.array().items(
      Joi.object({
        description: Joi.string().required()
      })
    ),
    
    deliverables: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('document', 'certificate', 'report', 'video', 'image', 'other').required()
      })
    ),
    
    verification: Joi.object({
      isRequired: Joi.boolean().default(true),
      method: Joi.string().valid('document_review', 'site_visit', 'remote_monitoring', 'third_party_audit').default('document_review')
    }),
    
    technicalSpecs: Joi.object({
      performanceTargets: Joi.array().items(
        Joi.object({
          parameter: Joi.string(),
          targetValue: Joi.number(),
          unit: Joi.string()
        })
      ),
      qualityStandards: Joi.array().items(Joi.string()),
      complianceChecks: Joi.array().items(
        Joi.object({
          regulation: Joi.string(),
          status: Joi.string().valid('pending', 'compliant', 'non_compliant')
        })
      )
    }),
    
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    
    tags: Joi.array().items(Joi.string().max(50))
  })
)

// Update milestone validation
export const validateMilestoneUpdate = validate(
  Joi.object({
    completionPercentage: Joi.number().min(0).max(100),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'overdue', 'cancelled'),
    actualStartDate: Joi.date(),
    actualEndDate: Joi.date(),
    requirements: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        isCompleted: Joi.boolean(),
        completedDate: Joi.date(),
        verifiedBy: Joi.string()
      })
    ),
    deliverables: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('document', 'certificate', 'report', 'video', 'image', 'other').required(),
        url: Joi.string().uri(),
        isSubmitted: Joi.boolean(),
        submittedDate: Joi.date(),
        submittedBy: Joi.string()
      })
    ),
    technicalSpecs: Joi.object({
      performanceTargets: Joi.array().items(
        Joi.object({
          parameter: Joi.string(),
          targetValue: Joi.number(),
          actualValue: Joi.number(),
          unit: Joi.string(),
          achieved: Joi.boolean()
        })
      )
    })
  })
)

// Blockchain transaction validation
export const validateTransaction = validate(
  Joi.object({
    txHash: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{64}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid transaction hash',
        'any.required': 'Transaction hash is required'
      }),
    
    amount: Joi.number().positive().messages({
      'number.positive': 'Amount must be positive'
    }),
    
    gasPrice: Joi.string(),
    gasUsed: Joi.string(),
    blockNumber: Joi.number().integer().positive()
  })
)

// File upload validation
export const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return next(new ErrorResponse('No file uploaded', 400))
  }

  const file = req.file || req.files[0]
  
  // Check file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return next(new ErrorResponse('File size cannot exceed 10MB', 400))
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  if (!allowedTypes.includes(file.mimetype)) {
    return next(new ErrorResponse('Invalid file type. Allowed types: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX', 400))
  }

  next()
}

// Query parameter validation for pagination and filtering
export const validateQuery = validate(
  Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().max(200),
    status: Joi.string(),
    category: Joi.string(),
    startDate: Joi.date(),
    endDate: Joi.date().greater(Joi.ref('startDate'))
  }),
  'query'
)
