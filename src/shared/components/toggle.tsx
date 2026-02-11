'use client'

import { forwardRef, useState, useEffect, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeConfig = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translatePx: 16,
    labelText: 'text-sm',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translatePx: 20,
    labelText: 'text-base',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translatePx: 28,
    labelText: 'text-lg',
  },
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, size = 'md', disabled, checked, defaultChecked, id, onChange, ...props }, ref) => {
    const toggleId = id || props.name
    const config = sizeConfig[size]

    // Track checked state for thumb animation
    const [isChecked, setIsChecked] = useState(checked ?? defaultChecked ?? false)

    // Sync with controlled prop
    useEffect(() => {
      if (checked !== undefined) setIsChecked(checked)
    }, [checked])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) setIsChecked(e.target.checked)
      onChange?.(e)
    }

    return (
      <label
        htmlFor={toggleId}
        className={cn(
          'inline-flex items-start gap-3 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="relative inline-flex items-center shrink-0">
          <input
            ref={ref}
            type="checkbox"
            id={toggleId}
            disabled={disabled}
            checked={checked}
            defaultChecked={defaultChecked}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          {/* Track */}
          <div
            className={cn(
              config.track,
              `
              bg-white/[0.08]
              border border-white/[0.10]
              rounded-full
              transition-all duration-200 ease-out
              peer-checked:bg-[#009e59]
              peer-checked:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]
              peer-focus-visible:ring-2
              peer-focus-visible:ring-[#009e59]
              peer-focus-visible:ring-offset-2
              peer-focus-visible:ring-offset-slate-950
              `
            )}
          />
          {/* Thumb */}
          <div
            className={cn(
              config.thumb,
              'absolute left-0.5 bg-white rounded-full shadow-md transition-transform duration-200 ease-out'
            )}
            style={{ transform: isChecked ? `translateX(${config.translatePx}px)` : 'translateX(0)' }}
          />
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className={cn('font-medium text-gray-300', config.labelText)}>
                {label}
              </span>
            )}
            {description && (
              <span className="text-sm text-gray-400">{description}</span>
            )}
          </div>
        )}
      </label>
    )
  }
)

Toggle.displayName = 'Toggle'

export { Toggle }
