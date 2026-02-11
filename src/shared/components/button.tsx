'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-neu
      border border-white/[0.08]
      transition-all duration-150 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#009e59] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    `

    const variantStyles = {
      primary: `
        bg-gradient-to-r from-[#009e59] to-[#00c96f]
        text-white
        border-[#009e59]
        shadow-md
        hover:shadow-[0_0_20px_rgba(0,158,89,0.3)] hover:brightness-110
        active:scale-[0.98]
      `,
      secondary: `
        bg-white/[0.06]
        text-gray-200
        hover:bg-white/[0.10]
        active:scale-[0.98]
      `,
      ghost: `
        shadow-none
        border-transparent
        text-gray-300
        hover:bg-white/[0.06]
        hover:text-gray-200
        active:scale-[0.98]
      `,
      danger: `
        bg-red-500/10
        text-red-400
        border-red-500/20
        hover:bg-red-500/20
        active:scale-[0.98]
      `,
      success: `
        bg-emerald-500/10
        text-emerald-400
        border-emerald-500/20
        hover:bg-emerald-500/20
        active:scale-[0.98]
      `,
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl min-h-[60px]',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="w-4 h-4" />
            <span>Cargando...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Loading Spinner Component
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export { Button, LoadingSpinner }
