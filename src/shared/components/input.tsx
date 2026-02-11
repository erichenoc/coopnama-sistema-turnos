'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              `
              w-full
              bg-white/[0.05]
              border border-white/[0.10]
              rounded-neu-sm
              px-4 py-3
              text-white
              placeholder:text-gray-400
              transition-all duration-150 ease-out
              focus:outline-none
              focus:border-[#009e59]/50
              focus:ring-2
              focus:ring-[#009e59]/20
              focus:bg-white/[0.07]
              disabled:opacity-50
              disabled:cursor-not-allowed
              `,
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-red-500/50 ring-2 ring-red-500/20',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-coopnama-danger">{error}</p>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-400">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea Component
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, disabled, id, ...props }, ref) => {
    const textareaId = id || props.name

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            `
            w-full
            bg-white/[0.05]
            border border-white/[0.10]
            rounded-neu-sm
            px-4 py-3
            text-white
            placeholder:text-gray-400
            transition-all duration-150 ease-out
            resize-none
            focus:outline-none
            focus:border-[#009e59]/50
            focus:ring-2
            focus:ring-[#009e59]/20
            focus:bg-white/[0.07]
            disabled:opacity-50
            disabled:cursor-not-allowed
            `,
            error && 'border-red-500/50 ring-2 ring-red-500/20',
            className
          )}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-coopnama-danger">{error}</p>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-400">{hint}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }
