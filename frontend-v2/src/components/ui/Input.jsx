import React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef(({ 
  className, 
  type = 'text',
  icon: Icon,
  error,
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      <div className="relative">
        {Icon && (
          <Icon className="input-icon" />
        )}
        <input
          type={type}
          className={cn(
            'input',
            Icon && 'input-with-icon',
            error && 'border-error-500 focus-visible:ring-error-500',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
      {error && (
        <p className="text-error-600 text-xs mt-1">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
