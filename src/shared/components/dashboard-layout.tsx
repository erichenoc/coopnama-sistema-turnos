'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar, MobileSidebar, type NavItem } from './sidebar'
import { Header, type HeaderProps } from './header'
import { cn } from '@/shared/utils/cn'

export interface DashboardLayoutProps {
  children: ReactNode
  navItems: NavItem[]
  headerProps?: Omit<HeaderProps, 'onMenuClick'>
  sidebarFooter?: ReactNode
  sidebarLogo?: ReactNode
  className?: string
}

export function DashboardLayout({
  children,
  navItems,
  headerProps,
  sidebarFooter,
  sidebarLogo,
  className,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-neu-bg">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <Sidebar
          items={navItems}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          footer={sidebarFooter}
          logo={sidebarLogo}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        items={navItems}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        footer={sidebarFooter}
        logo={sidebarLogo}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-20">
          <Header
            {...headerProps}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
        </div>

        {/* Page Content */}
        <main className={cn('p-4 lg:p-6', className)}>
          {children}
        </main>
      </div>
    </div>
  )
}

// Page header for consistent styling within dashboard
interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {description && (
          <p className="mt-1 text-gray-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

// Stats card for dashboard overview
interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    label: string
    positive?: boolean
  }
  icon?: ReactNode
  className?: string
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'p-5 bg-neu-bg shadow-neu rounded-neu',
        'transition-shadow duration-200 hover:shadow-neu-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  change.positive ? 'text-coopnama-secondary' : 'text-coopnama-danger'
                )}
              >
                {change.positive ? '+' : ''}{change.value}%
              </span>
              <span className="text-xs text-gray-500">{change.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={`
              p-3
              bg-coopnama-primary/10
              rounded-neu-sm
              text-coopnama-primary
            `}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// Empty state for when there's no data
interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        'bg-neu-bg shadow-neu-inset rounded-neu',
        className
      )}
    >
      {icon && (
        <div className="mb-4 p-4 bg-gray-100 rounded-full text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}

// Grid layout for dashboard content
interface DashboardGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function DashboardGrid({ children, columns = 3, className }: DashboardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4 lg:gap-6', gridCols[columns], className)}>
      {children}
    </div>
  )
}
