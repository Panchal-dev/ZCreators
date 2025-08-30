import React from 'react'
import { cn } from '../../lib/utils'

const Badge = ({ className, variant = 'default', ...props }) => {
  const variants = {
    default: 'badge-default',
    secondary: 'badge-secondary',
    destructive: 'badge-destructive',
    outline: 'badge-outline',
    success: 'badge-success',
    warning: 'badge-warning',
  }

  return (
    <div className={cn('badge', variants[variant], className)} {...props} />
  )
}

export default Badge
