import axios from 'axios'
import { toast } from 'react-hot-toast'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    const status = error.response?.status

    // Handle specific error cases
    if (status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        toast.error('Session expired. Please login again.')
        window.location.href = '/login'
      }
    } else if (status === 403) {
      toast.error('Access denied. Insufficient permissions.')
    } else if (status === 404) {
      toast.error('Resource not found.')
    } else if (status === 429) {
      toast.error('Too many requests. Please try again later.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (!error.response) {
      // Network error
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

// Authentication API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
}

// Projects API
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  submit: (id) => api.post(`/projects/${id}/submit`),
  approve: (id, approvalData) => api.post(`/projects/${id}/approve`, approvalData),
  reject: (id, rejectionData) => api.post(`/projects/${id}/reject`, rejectionData),
  getStats: () => api.get('/projects/stats'),
  uploadDocuments: (id, formData) => {
    return api.post(`/projects/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  downloadDocument: (id, documentId) => {
    return api.get(`/projects/${id}/documents/${documentId}`, {
      responseType: 'blob',
    })
  },
}

// Milestones API
export const milestonesAPI = {
  getAll: (projectId, params) => api.get(`/projects/${projectId}/milestones`, { params }),
  getById: (projectId, id) => api.get(`/projects/${projectId}/milestones/${id}`),
  create: (projectId, milestoneData) => api.post(`/projects/${projectId}/milestones`, milestoneData),
  update: (projectId, id, milestoneData) => api.put(`/projects/${projectId}/milestones/${id}`, milestoneData),
  delete: (projectId, id) => api.delete(`/projects/${projectId}/milestones/${id}`),
  markComplete: (projectId, id, completionData) => api.post(`/projects/${projectId}/milestones/${id}/complete`, completionData),
  verify: (projectId, id, verificationData) => api.post(`/projects/${projectId}/milestones/${id}/verify`, verificationData),
  uploadEvidence: (projectId, id, formData) => {
    return api.post(`/projects/${projectId}/milestones/${id}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

// Audits API
export const auditsAPI = {
  getAll: (params) => api.get('/audits', { params }),
  getById: (id) => api.get(`/audits/${id}`),
  create: (auditData) => api.post('/audits', auditData),
  update: (id, auditData) => api.put(`/audits/${id}`, auditData),
  delete: (id) => api.delete(`/audits/${id}`),
  submit: (id, reportData) => api.post(`/audits/${id}/submit`, reportData),
  getByProject: (projectId, params) => api.get(`/projects/${projectId}/audits`, { params }),
  uploadReport: (id, formData) => {
    return api.post(`/audits/${id}/report`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getById: (id) => api.get(`/notifications/${id}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  subscribe: (subscriptionData) => api.post('/notifications/subscribe', subscriptionData),
  unsubscribe: (type) => api.post('/notifications/unsubscribe', { type }),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: (params) => api.get('/dashboard/recent-activity', { params }),
  getChartData: (type, params) => api.get(`/dashboard/charts/${type}`, { params }),
  getMetrics: (period) => api.get('/dashboard/metrics', { params: { period } }),
}

// Blockchain API
export const blockchainAPI = {
  getTransactions: (params) => api.get('/blockchain/transactions', { params }),
  getTransaction: (hash) => api.get(`/blockchain/transactions/${hash}`),
  verifyTransaction: (hash) => api.post(`/blockchain/transactions/${hash}/verify`),
  getContractInfo: () => api.get('/blockchain/contract'),
  getGasPrice: () => api.get('/blockchain/gas-price'),
  estimateGas: (operation) => api.post('/blockchain/estimate-gas', { operation }),
}

// Users API (Admin only)
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  getStats: () => api.get('/users/stats'),
}

// File upload helper
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  return api.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(percentCompleted)
      }
    },
  })
}

// Export the configured axios instance for custom requests
export default api
