'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}: ModalProps) {
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose()
      }
    },
    [closeOnEscape, onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={cn(
          'relative w-full',
          sizeClasses[size],
          'bg-slate-900/95 backdrop-blur-xl border border-white/[0.10]',
          'shadow-glass-lg',
          'rounded-neu-lg',
          'animate-scale-in',
          className
        )}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className={`
              absolute top-4 right-4
              w-8 h-8
              flex items-center justify-center
              bg-white/[0.06] border border-white/[0.08]
              rounded-full
              text-gray-300
              hover:text-white
              hover:bg-white/[0.10]
              active:scale-95
              transition-all duration-150
              focus:outline-none
              focus:ring-2
              focus:ring-[#009e59]
              focus:ring-offset-2
              focus:ring-offset-slate-900
            `}
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  )

  // Use portal to render modal at document body level
  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}

// Modal subcomponents
interface ModalSectionProps {
  children: ReactNode
  className?: string
}

export function ModalHeader({ children, className }: ModalSectionProps) {
  return (
    <div className={cn('px-6 pt-6 pb-4', className)}>
      {children}
    </div>
  )
}

export function ModalBody({ children, className }: ModalSectionProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: ModalSectionProps) {
  return (
    <div className={cn('px-6 py-4 flex justify-end gap-3 border-t border-white/[0.08]', className)}>
      {children}
    </div>
  )
}

// Confirmation dialog helper
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const variantColors = {
    danger: 'bg-coopnama-danger text-white hover:bg-red-600',
    warning: 'bg-coopnama-accent text-white hover:bg-amber-600',
    info: 'bg-gradient-to-r from-[#009e59] to-[#00c96f] text-white hover:brightness-110',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <ModalHeader>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </ModalHeader>
      <ModalBody>
        <p className="text-gray-300">{message}</p>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={isLoading}
          className={`
            px-4 py-2
            bg-white/[0.06] border border-white/[0.08]
            rounded-neu-sm
            text-gray-300
            hover:bg-white/[0.10]
            active:scale-[0.98]
            transition-all duration-150
            disabled:opacity-50
          `}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'px-4 py-2 rounded-neu-sm transition-all duration-150 disabled:opacity-50',
            variantColors[variant]
          )}
        >
          {isLoading ? 'Procesando...' : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  )
}
