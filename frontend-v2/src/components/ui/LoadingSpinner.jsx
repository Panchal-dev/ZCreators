import React from 'react'
import { cn } from '../../lib/utils'

const LoadingSpinner = ({ size = 'md', className, ...props }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  }

  return (
    <div
      className={cn(
        'loading-spinner',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export const LoadingDots = ({ className, ...props }) => {
  return (
    <div className={cn('loading-dots', className)} {...props}>
      <div className="loading-dot" style={{ animationDelay: '0ms' }} />
      <div className="loading-dot" style={{ animationDelay: '150ms' }} />
      <div className="loading-dot" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

export const LoadingOverlay = ({ children, isLoading, className, ...props }) => {
  return (
    <div className={cn('relative', className)} {...props}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  )
}

export const LoadingCard = ({ className, ...props }) => {
  return (
    <div className={cn('card animate-pulse', className)} {...props}>
      <div className="card-header">
        <div className="h-4 bg-muted rounded w-1/4 mb-2" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      <div className="card-content space-y-3">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}

export const FullPageLoader = ({ message = 'Loading...', className, ...props }) => {
  return (
    <div 
      className={cn(
        'min-h-screen bg-background flex flex-col items-center justify-center',
        className
      )} 
      {...props}
    >
      <LoadingSpinner size="xl" className="mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

export default LoadingSpinner
