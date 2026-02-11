'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'inset' | 'flat'
  size?: 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'raised',
      size = 'md',
      hoverable = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      raised: 'bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] shadow-glass',
      inset: 'bg-black/[0.15] border border-white/[0.04] shadow-neu-inset',
      flat: 'bg-white/[0.04] border border-white/[0.06]',
    }

    const sizeStyles = {
      sm: 'p-4 rounded-neu-sm',
      md: 'p-6 rounded-neu',
      lg: 'p-8 rounded-neu-lg',
    }

    return (
      <div
        ref={ref}
        className={cn(
          variantStyles[variant],
          sizeStyles[size],
          hoverable && 'transition-all duration-200 hover:bg-white/[0.08] hover:border-white/[0.12] cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

// Card Title
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold text-white', className)}
      {...props}
    >
      {children}
    </h3>
  )
)

CardTitle.displayName = 'CardTitle'

// Card Description
interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-400', className)}
      {...props}
    >
      {children}
    </p>
  )
)

CardDescription.displayName = 'CardDescription'

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props}>
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4 mt-4 border-t border-white/[0.08]', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
