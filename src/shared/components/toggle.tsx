'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
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
    translate: 'translate-x-4',
    labelText: 'text-sm',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
    labelText: 'text-base',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translate: 'translate-x-7',
    labelText: 'text-lg',
  },
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, size = 'md', disabled, id, ...props }, ref) => {
    const toggleId = id || props.name
    const config = sizeConfig[size]

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
            className="sr-only peer"
            {...props}
          />
          {/* Track */}
          <div
            className={cn(
              config.track,
              `
              bg-neu-bg
              shadow-neu-inset
              rounded-full
              transition-all duration-200 ease-out
              peer-checked:bg-coopnama-primary
              peer-checked:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]
              peer-focus-visible:ring-2
              peer-focus-visible:ring-coopnama-primary
              peer-focus-visible:ring-offset-2
              peer-focus-visible:ring-offset-neu-bg
              `
            )}
          />
          {/* Thumb */}
          <div
            className={cn(
              config.thumb,
              `
              absolute
              left-0.5
              bg-white
              rounded-full
              shadow-neu-sm
              transition-transform duration-200 ease-out
              peer-checked:${config.translate}
              `
            )}
          />
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className={cn('font-medium text-gray-700', config.labelText)}>
                {label}
              </span>
            )}
            {description && (
              <span className="text-sm text-gray-500">{description}</span>
            )}
          </div>
        )}
      </label>
    )
  }
)

Toggle.displayName = 'Toggle'

export { Toggle }
