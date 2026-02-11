'use client'

import { useState } from 'react'
import { Button } from '@/shared/components'
import type { CopilotCallbacks } from '../types'
import { useCopilotStore } from '../store/copilot-store'

interface QuickActionsBarProps {
  callbacks: CopilotCallbacks
  notes: string
  isVoiceSupported?: boolean
  isListening?: boolean
  onToggleVoice?: () => void
  voiceTranscript?: string
}

export function QuickActionsBar({
  callbacks,
  isVoiceSupported = false,
  isListening = false,
  onToggleVoice,
  voiceTranscript,
}: QuickActionsBarProps) {
  const { lastCopySuggestion } = useCopilotStore()
  const [copied, setCopied] = useState(false)

  const handleCopyToNotes = () => {
    if (!lastCopySuggestion) return
    callbacks.onAppendToNotes(lastCopySuggestion)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEscalate = () => {
    callbacks.onEscalatePriority(1)
  }

  // Append voice transcript to notes
  const handleVoiceToNotes = () => {
    if (voiceTranscript) {
      callbacks.onAppendToNotes(voiceTranscript)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-white/[0.08] bg-white/[0.06]">
      <Button
        variant="secondary"
        onClick={handleCopyToNotes}
        disabled={!lastCopySuggestion}
        className="text-xs px-3 py-1.5"
      >
        {copied ? 'Copiado' : 'Copiar a notas'}
      </Button>

      {isVoiceSupported && (
        <Button
          variant={isListening ? 'primary' : 'secondary'}
          onClick={isListening && voiceTranscript ? handleVoiceToNotes : onToggleVoice}
          className={`text-xs px-3 py-1.5 ${isListening ? 'animate-pulse' : ''}`}
        >
          {isListening ? 'Dictando...' : 'Mic'}
        </Button>
      )}

      <div className="flex-1" />

      <Button
        variant="secondary"
        onClick={handleEscalate}
        className="text-xs px-3 py-1.5 text-orange-400 hover:text-orange-300"
      >
        Escalar prioridad
      </Button>
    </div>
  )
}
