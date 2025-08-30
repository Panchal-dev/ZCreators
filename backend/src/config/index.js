import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5000,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/green-hydrogen',
    options: {
      // Remove deprecated options for MongoDB driver v4.0+
    }
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Blockchain
  blockchain: {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    contractAddress: process.env.CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890',
    chainId: parseInt(process.env.CHAIN_ID) || 31337,
    privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
    oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
    gasLimit: process.env.GAS_LIMIT || '500000',
    gasPrice: process.env.GAS_PRICE || '20000000000' // 20 gwei
  },

  // Oracle
  oracle: {
    enabled: process.env.ORACLE_ENABLED === 'true' || true,
    apiKey: process.env.ORACLE_API_KEY || 'demo-oracle-key',
    webhookUrl: process.env.ORACLE_WEBHOOK_URL,
    verificationThreshold: parseFloat(process.env.ORACLE_THRESHOLD) || 0.85
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.ms-excel'],
    destination: process.env.UPLOAD_PATH || './uploads'
  },

  // External APIs
  apis: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    bank: {
      apiUrl: process.env.BANK_API_URL || 'https://api.sandbox-bank.com',
      apiKey: process.env.BANK_API_KEY || 'demo-bank-key',
      clientId: process.env.BANK_CLIENT_ID
    }
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'app.log',

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],

  // Email (for notifications)
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@greenhydrogen.gov'
  },

  // Webhook endpoints
  webhooks: {
    payment: process.env.PAYMENT_WEBHOOK_URL,
    oracle: process.env.ORACLE_WEBHOOK_URL
  }
}

// Validation for required production settings
if (config.isProduction) {
  const requiredEnvVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'RPC_URL',
    'CONTRACT_ADDRESS',
    'PRIVATE_KEY'
  ]

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
}

export default config
