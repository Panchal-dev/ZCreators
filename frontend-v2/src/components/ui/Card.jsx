import React from 'react'
import { cn } from '../../lib/utils'

const Card = ({ className, ...props }) => (
  <div
    className={cn('card', className)}
    {...props}
  />
)

const CardHeader = ({ className, ...props }) => (
  <div className={cn('card-header', className)} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('card-title', className)} {...props} />
)

const CardDescription = ({ className, ...props }) => (
  <p className={cn('card-description', className)} {...props} />
)

const CardContent = ({ className, ...props }) => (
  <div className={cn('card-content', className)} {...props} />
)

const CardFooter = ({ className, ...props }) => (
  <div className={cn('card-footer', className)} {...props} />
)

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export default Card
export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
