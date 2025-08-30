import React, { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { authAPI } from '../services/api'

const AuthContext = createContext(undefined)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setIsLoading(false)
          return
        }

        // Verify token with backend
        const response = await authAPI.me()
        
        if (response.success) {
          setUser(response.user)
          setIsAuthenticated(true)
        } else {
          // Invalid token, remove it
          localStorage.removeItem('token')
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('token')
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (credentials) => {
    try {
      setIsLoading(true)
      const response = await authAPI.login(credentials)

      if (response.success) {
        const { token, user: userData } = response
        
        // Store token
        localStorage.setItem('token', token)
        
        // Update state
        setUser(userData)
        setIsAuthenticated(true)
        
        toast.success(`Welcome back, ${userData.name}!`)
        
        return { success: true, user: userData }
      } else {
        toast.error(response.message || 'Login failed')
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.'
      toast.error(message)
      return { success: false, message }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setIsLoading(true)
      const response = await authAPI.register(userData)

      if (response.success) {
        const { token, user: newUser } = response
        
        // Store token
        localStorage.setItem('token', token)
        
        // Update state
        setUser(newUser)
        setIsAuthenticated(true)
        
        toast.success(`Welcome to the platform, ${newUser.name}!`)
        
        return { success: true, user: newUser }
      } else {
        toast.error(response.message || 'Registration failed')
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.'
      toast.error(message)
      return { success: false, message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      
      // Call logout API to invalidate token on server
      await authAPI.logout()
      
      // Clear local storage
      localStorage.removeItem('token')
      
      // Update state
      setUser(null)
      setIsAuthenticated(false)
      
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local state even if API call fails
      localStorage.removeItem('token')
      setUser(null)
      setIsAuthenticated(false)
      
      toast.success('Logged out')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData)
      
      if (response.success) {
        setUser(response.user)
        toast.success('Profile updated successfully')
        return { success: true, user: response.user }
      } else {
        toast.error(response.message || 'Profile update failed')
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return { success: false, message }
    }
  }

  const changePassword = async (passwordData) => {
    try {
      const response = await authAPI.changePassword(passwordData)
      
      if (response.success) {
        toast.success('Password changed successfully')
        return { success: true }
      } else {
        toast.error(response.message || 'Password change failed')
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed'
      toast.error(message)
      return { success: false, message }
    }
  }

  // Helper methods
  const hasRole = (role) => {
    return user?.role === role
  }

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role)
  }

  const isGovernment = () => hasRole('government')
  const isProducer = () => hasRole('producer')
  const isAuditor = () => hasRole('auditor')

  const value = {
    // State
    user,
    isLoading,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    
    // Helpers
    hasRole,
    hasAnyRole,
    isGovernment,
    isProducer,
    isAuditor,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
