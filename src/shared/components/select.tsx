'use client'

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options,
      placeholder,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              `
              w-full
              bg-white/[0.05]
              border border-white/[0.10]
              rounded-neu-sm
              px-4 py-3
              pr-10
              text-white
              appearance-none
              cursor-pointer
              transition-all duration-150 ease-out
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown arrow */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
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

Select.displayName = 'Select'

export { Select }
