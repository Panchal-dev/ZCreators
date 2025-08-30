import express from 'express'
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout
} from '../controllers/auth.controller.js'
import {
  protect,
  authRateLimit,
  validateWalletOwnership
} from '../middleware/auth.js'
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange
} from '../middleware/validation.js'

const router = express.Router()

// Public routes with rate limiting
router.post('/register', authRateLimit(), validateRegistration, validateWalletOwnership, register)
router.post('/login', authRateLimit(), validateLogin, login)
router.post('/forgot-password', authRateLimit(15 * 60 * 1000, 3), forgotPassword)
router.put('/reset-password/:resetToken', authRateLimit(), resetPassword)
router.get('/verify-email/:token', verifyEmail)

// Protected routes
router.use(protect) // All routes after this middleware are protected

router.get('/me', getMe)
router.put('/profile', validateWalletOwnership, updateProfile)
router.put('/change-password', validatePasswordChange, changePassword)
router.post('/logout', logout)

export default router
