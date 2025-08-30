import mongoose from 'mongoose'
import config from './index.js'
import logger from '../utils/logger.js'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options)
    
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`)
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected')
    })
    
    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected')
    })
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('🔌 MongoDB connection closed through app termination')
    })
    
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

export default connectDB
