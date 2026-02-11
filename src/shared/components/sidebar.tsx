'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/utils/cn'
import { LOGO_URL } from './coopnama-logo'

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
        'bg-slate-900/90 backdrop-blur-xl',
        'border-r border-white/[0.06]',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Logo Section */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-white/[0.06]',
          collapsed ? 'justify-center px-2' : 'px-4'
        )}
      >
        {logo || (
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <Image src={LOGO_URL} alt="COOPNAMA" width={48} height={48} className="rounded-lg object-contain" priority />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-white">COOPNAMA</span>
                <span className="text-xs text-gray-300">Sistema de Turnos</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.label}>
              {item.children ? (
                // Parent with children
                <div>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-neu-sm',
                      'transition-all duration-150',
                      'text-gray-300 hover:bg-white/[0.06] hover:text-white',
                      isParentActive(item) && 'bg-[#009e59]/15 text-emerald-300',
                      collapsed && 'justify-center'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
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
                    <ul className="mt-1 ml-4 pl-4 border-l border-white/[0.08] space-y-1">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-neu-sm text-sm',
                              'transition-all duration-150',
                              isActive(child.href)
                                ? 'bg-[#009e59]/15 text-emerald-300 border border-[#009e59]/25'
                                : 'hover:bg-white/[0.06] text-gray-300 hover:text-white'
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
                    'flex items-center gap-3 px-3 py-2 rounded-neu-sm',
                    'transition-all duration-150',
                    isActive(item.href)
                      ? 'bg-[#009e59]/15 text-emerald-300 border border-[#009e59]/25'
                      : 'hover:bg-white/[0.06] text-gray-300 hover:text-white',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-xl">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
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
            'bg-white/[0.06] border border-white/[0.08]',
            'hover:bg-white/[0.10] active:scale-95',
            'transition-all duration-150',
            'text-gray-300 hover:text-white',
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
        <div className={cn('border-t border-white/[0.06] p-4', collapsed && 'px-2')}>
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
