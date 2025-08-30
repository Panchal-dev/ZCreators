import React from 'react'
import { cn } from '../../lib/utils'

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  asChild = false, 
  children,
  loading = false,
  disabled,
  ...props 
}, ref) => {
  const Comp = asChild ? 'div' : 'button'
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    destructive: 'btn-destructive',
  }

  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    xl: 'btn-xl',
  }

  return (
    <Comp
      className={cn(
        'btn',
        variants[variant],
        sizes[size],
        loading && 'opacity-50 cursor-not-allowed',
        className
      )}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 mr-2 loading-spinner" />
      )}
      {children}
    </Comp>
  )
})

Button.displayName = 'Button'

export default Button
