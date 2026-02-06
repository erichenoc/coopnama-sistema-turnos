'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/utils/cn'

export interface NavItem {
  label: string
  href: string
  icon: ReactNode
  badge?: string | number
  children?: NavItem[]
}

export interface SidebarProps {
  items: NavItem[]
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  logo?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Sidebar({
  items,
  collapsed = false,
  onCollapsedChange,
  logo,
  footer,
  className,
}: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  const isActive = (href: string) => pathname === href
  const isParentActive = (item: NavItem) =>
    item.children?.some((child) => pathname === child.href)

  return (
    <aside
      className={cn(
        'h-screen flex flex-col',
        'bg-neu-bg',
        'shadow-[4px_0_12px_#b8b9be]',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Logo Section */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-gray-200/50',
          collapsed ? 'justify-center px-2' : 'px-4'
        )}
      >
        {logo || (
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-10 h-10 bg-coopnama-primary rounded-neu-sm shadow-neu-sm flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-gray-800">COOPNAMA</span>
                <span className="text-xs text-gray-500">Sistema de Turnos</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label}>
              {item.children ? (
                // Parent with children
                <div>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-neu-sm',
                      'transition-all duration-150',
                      'hover:shadow-neu-sm',
                      isParentActive(item) && 'bg-coopnama-primary/10 text-coopnama-primary',
                      collapsed && 'justify-center'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        <svg
                          className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            expandedItems.includes(item.label) && 'rotate-180'
                          )}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                  {!collapsed && expandedItems.includes(item.label) && (
                    <ul className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-neu-sm text-sm',
                              'transition-all duration-150',
                              isActive(child.href)
                                ? 'shadow-neu-inset-sm bg-coopnama-primary text-white'
                                : 'hover:shadow-neu-xs text-gray-600 hover:text-gray-800'
                            )}
                          >
                            <span>{child.icon}</span>
                            <span>{child.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // Single item
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-neu-sm',
                    'transition-all duration-150',
                    isActive(item.href)
                      ? 'shadow-neu-inset bg-coopnama-primary text-white'
                      : 'hover:shadow-neu-sm text-gray-600 hover:text-gray-800',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-xl">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-coopnama-accent text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      {onCollapsedChange && (
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            'mx-3 mb-2 p-2 rounded-neu-sm',
            'bg-neu-bg shadow-neu-sm',
            'hover:shadow-neu-xs active:shadow-neu-inset-xs',
            'transition-all duration-150',
            'text-gray-500 hover:text-gray-700',
            collapsed ? 'self-center' : 'self-end'
          )}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <svg
            className={cn('w-5 h-5 transition-transform duration-300', collapsed && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Footer */}
      {footer && (
        <div className={cn('border-t border-gray-200/50 p-4', collapsed && 'px-2')}>
          {footer}
        </div>
      )}
    </aside>
  )
}

// Mobile sidebar with overlay
interface MobileSidebarProps extends SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose, ...props }: MobileSidebarProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 animate-slide-in">
        <Sidebar {...props} collapsed={false} />
      </div>
    </div>
  )
}
