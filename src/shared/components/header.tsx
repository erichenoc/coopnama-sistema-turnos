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
  breadcrumbs?: { label: string; href?: string }[]
  className?: string
}

export function Header({
  title,
  subtitle,
  user,
  onMenuClick,
  actions,
  breadcrumbs,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'h-16 flex items-center justify-between px-4 lg:px-6',
        'bg-neu-bg',
        'shadow-[0_4px_12px_#b8b9be]',
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
              bg-neu-bg
              shadow-neu-sm
              rounded-neu-sm
              hover:shadow-neu-xs
              active:shadow-neu-inset-xs
              transition-all duration-150
              text-gray-600
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
            <nav className="flex items-center gap-1 text-sm text-gray-500 mb-0.5">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <span className="mx-1">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-coopnama-primary transition-colors">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-gray-700">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          {title && (
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Custom Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Notifications */}
        <button
          className={`
            relative
            p-2
            bg-neu-bg
            shadow-neu-sm
            rounded-full
            hover:shadow-neu-xs
            active:shadow-neu-inset-xs
            transition-all duration-150
            text-gray-600
          `}
          aria-label="Notificaciones"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* Notification Badge */}
          <span className="absolute top-0 right-0 w-2 h-2 bg-coopnama-danger rounded-full" />
        </button>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              {user.role && (
                <p className="text-xs text-gray-500">{user.role}</p>
              )}
            </div>
            <button
              className={`
                bg-neu-bg
                shadow-neu-sm
                rounded-full
                p-0.5
                hover:shadow-neu-xs
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
        )}
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
              bg-neu-bg
              shadow-neu-inset
              rounded-full
              text-gray-700
              placeholder:text-gray-400
              focus:outline-none
              focus:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff,0_0_0_2px_rgba(30,64,175,0.2)]
              transition-shadow duration-150
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
