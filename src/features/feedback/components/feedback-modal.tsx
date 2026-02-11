'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@/shared/components'
import { submitFeedbackAction } from '@/features/feedback/actions/feedback-actions'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string
  ticketNumber: string
}

const STAR_LABELS = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente']

export function FeedbackModal({ isOpen, onClose, ticketId, ticketNumber }: FeedbackModalProps) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)
    const result = await submitFeedbackAction({
      ticketId,
      rating,
      comment: comment.trim() || undefined,
    })
    setSubmitting(false)

    if (!result.error) {
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        // Reset state for next use
        setRating(0)
        setComment('')
        setSubmitted(false)
      }, 2000)
    }
  }

  const handleClose = () => {
    onClose()
    setRating(0)
    setComment('')
    setSubmitted(false)
  }

  const displayRating = hoveredStar || rating

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader>
        <h3 className="text-xl font-bold text-white">Evaluar Servicio</h3>
        <p className="text-sm text-gray-300 mt-1">Turno {ticketNumber}</p>
      </ModalHeader>
      <ModalBody>
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-white">Gracias por su evaluacion</p>
            <p className="text-sm text-gray-300 mt-1">Su opinion nos ayuda a mejorar</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Star Rating */}
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-3">Como fue su experiencia?</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <svg
                      className={`w-10 h-10 ${
                        star <= displayRating ? 'text-amber-400' : 'text-gray-300'
                      } transition-colors`}
                      fill={star <= displayRating ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                ))}
              </div>
              {displayRating > 0 && (
                <p className="text-sm text-gray-300 mt-2">{STAR_LABELS[displayRating - 1]}</p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Comentario (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuentenos sobre su experiencia..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-neu-sm text-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30 resize-none"
              />
              <p className="text-xs text-gray-300 mt-1 text-right">{comment.length}/500</p>
            </div>
          </div>
        )}
      </ModalBody>
      {!submitted && (
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose}>
            Omitir
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={rating === 0}
            isLoading={submitting}
          >
            Enviar Evaluacion
          </Button>
        </ModalFooter>
      )}
    </Modal>
  )
}
