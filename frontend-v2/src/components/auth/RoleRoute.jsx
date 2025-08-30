import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { user, hasAnyRole } = useAuth()

  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default RoleRoute
