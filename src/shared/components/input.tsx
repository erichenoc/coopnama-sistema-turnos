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
            className="block text-sm font-medium text-gray-600 mb-2"
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
              bg-neu-bg
              shadow-neu-inset
              rounded-neu-sm
              px-4 py-3
              text-gray-700
              placeholder:text-gray-400
              transition-all duration-150 ease-out
              focus:outline-none
              focus:shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff,0_0_0_3px_rgba(30,64,175,0.2)]
              disabled:opacity-50
              disabled:cursor-not-allowed
              `,
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff,0_0_0_2px_rgba(239,68,68,0.4)]',
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
          <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
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
            className="block text-sm font-medium text-gray-600 mb-2"
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
            bg-neu-bg
            shadow-neu-inset
            rounded-neu-sm
            px-4 py-3
            text-gray-700
            placeholder:text-gray-400
            transition-all duration-150 ease-out
            resize-none
            focus:outline-none
            focus:shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff,0_0_0_3px_rgba(30,64,175,0.2)]
            disabled:opacity-50
            disabled:cursor-not-allowed
            `,
            error && 'shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff,0_0_0_2px_rgba(239,68,68,0.4)]',
            className
          )}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-coopnama-danger">{error}</p>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input, Textarea }
