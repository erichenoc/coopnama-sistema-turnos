'use client'

import { type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { Avatar } from './avatar'

export interface HeaderProps {
  title?: string
  subtitle?: string
  user?: {
    name: string
    email?: string
    avatar?: string
    role?: string
  }
  onMenuClick?: () => void
  actions?: ReactNode
  notificationSlot?: ReactNode
  userSlot?: ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  className?: string
}

export function Header({
  title,
  subtitle,
  user,
  onMenuClick,
  actions,
  notificationSlot,
  userSlot,
  breadcrumbs,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'h-16 flex items-center justify-between px-4 lg:px-6',
        'bg-slate-900/80 backdrop-blur-xl',
        'border-b border-white/[0.06]',
        className
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className={`
              lg:hidden
              p-2
              bg-white/[0.06] border border-white/[0.08]
              rounded-neu-sm
              hover:bg-white/[0.10]
              active:scale-95
              transition-all duration-150
              text-gray-300
            `}
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Title & Breadcrumbs */}
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm text-gray-400 mb-0.5">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <span className="mx-1">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-[#009e59] transition-colors">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-gray-200">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          {title && (
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Custom Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Notifications */}
        {notificationSlot}

        {/* User Profile */}
        {userSlot || (user && (
          <div className="flex items-center gap-3 pl-3 border-l border-white/[0.08]">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              {user.role && (
                <p className="text-xs text-gray-400">{user.role}</p>
              )}
            </div>
            <button
              className={`
                bg-white/[0.06] border border-white/[0.08]
                rounded-full
                p-0.5
                hover:bg-white/[0.10]
                transition-all duration-150
              `}
            >
              <Avatar
                name={user.name}
                src={user.avatar}
                size="sm"
              />
            </button>
          </div>
        ))}
      </div>
    </header>
  )
}

// Search Header variant
interface SearchHeaderProps extends Omit<HeaderProps, 'title' | 'subtitle'> {
  placeholder?: string
  onSearch?: (query: string) => void
  searchValue?: string
}

export function SearchHeader({
  placeholder = 'Buscar...',
  onSearch,
  searchValue = '',
  ...props
}: SearchHeaderProps) {
  return (
    <Header
      {...props}
      title={undefined}
      actions={
        <div className="relative">
          <input
            type="search"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearch?.(e.target.value)}
            className={`
              w-64 lg:w-96
              pl-10 pr-4 py-2
              bg-white/[0.05] border border-white/[0.10]
              rounded-full
              text-white
              placeholder:text-gray-400
              focus:outline-none
              focus:border-[#009e59]/50
              focus:ring-2
              focus:ring-[#009e59]/20
              transition-all duration-150
            `}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      }
    />
  )
}
