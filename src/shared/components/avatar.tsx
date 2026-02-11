'use client'

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export type UserStatus = 'online' | 'offline' | 'busy' | 'away'

export interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  name?: string
  status?: UserStatus
}

const Avatar = forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, size = 'md', name, status, src, alt, ...props }, ref) => {
    const sizeStyles = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
    }

    const statusSizeStyles = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    }

    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      busy: 'bg-red-500',
      away: 'bg-yellow-500',
    }

    // Generate initials from name
    const getInitials = (name?: string) => {
      if (!name) return '?'
      const words = name.split(' ')
      if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }

    // Generate background color from name (deterministic)
    const getColorFromName = (name?: string) => {
      if (!name) return 'bg-gray-400'
      const colors = [
        'bg-emerald-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500',
        'bg-orange-500',
        'bg-cyan-500',
      ]
      let hash = 0
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
      }
      return colors[Math.abs(hash) % colors.length]
    }

    return (
      <div className="relative inline-block">
        {src ? (
          <img
            ref={ref}
            src={src}
            alt={alt || name || 'Avatar'}
            className={cn(
              'rounded-full object-cover',
              'shadow-neu-xs',
              'border-2 border-slate-900',
              sizeStyles[size],
              className
            )}
            {...props}
          />
        ) : (
          <div
            className={cn(
              'rounded-full flex items-center justify-center',
              'shadow-neu-xs',
              'border-2 border-slate-900',
              'text-white font-medium',
              getColorFromName(name),
              sizeStyles[size],
              className
            )}
          >
            {getInitials(name)}
          </div>
        )}

        {/* Status indicator */}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full',
              'ring-2 ring-slate-900',
              statusColors[status],
              statusSizeStyles[size]
            )}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

// Avatar Group for displaying multiple avatars
export interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: AvatarProps['size']
  className?: string
}

const AvatarGroup = ({
  children,
  max = 4,
  size = 'md',
  className,
}: AvatarGroupProps) => {
  const childArray = Array.isArray(children)
    ? children
    : [children]
  const displayedChildren = childArray.slice(0, max)
  const remainingCount = childArray.length - max

  const overlapStyles = {
    xs: '-ml-2',
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
  }

  return (
    <div className={cn('flex items-center', className)}>
      {displayedChildren.map((child, index) => (
        <div
          key={index}
          className={cn(index > 0 && overlapStyles[size])}
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center',
            'bg-white/[0.10] text-gray-300 font-medium',
            'shadow-neu-xs border-2 border-slate-900',
            overlapStyles[size],
            {
              xs: 'w-6 h-6 text-xs',
              sm: 'w-8 h-8 text-xs',
              md: 'w-10 h-10 text-sm',
              lg: 'w-12 h-12 text-base',
              xl: 'w-16 h-16 text-lg',
            }[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

export { Avatar, AvatarGroup }
