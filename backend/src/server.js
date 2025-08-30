import app from './app.js'
import config from './config/index.js'
import logger from './utils/logger.js'

const PORT = config.port || 5000

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.nodeEnv} mode`)
  logger.info(`📊 Database: ${config.mongodb.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`)
  logger.info(`🔐 JWT Secret: ${config.jwt.secret ? '✓ Configured' : '✗ Missing'}`)
  logger.info(`⛓️ Blockchain RPC: ${config.blockchain.rpcUrl}`)
  logger.info(`📝 Logging Level: ${config.logLevel}`)
})

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`)
  } else {
    logger.error('❌ Server error:', error)
  }
  process.exit(1)
})

export default server
