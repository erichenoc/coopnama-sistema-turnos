'use client'

import { useCallback, useRef } from 'react'

interface AnnounceOptions {
  ticketNumber: string
  stationName: string
  customerName?: string | null
}

/**
 * Hook for announcing ticket calls via Inworld TTS.
 * Falls back to browser speechSynthesis if TTS API is unavailable.
 */
export function useTicketAnnouncer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingRef = useRef(false)
  const queueRef = useRef<AnnounceOptions[]>([])

  const playAudio = useCallback(async (options: AnnounceOptions) => {
    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })

      if (!response.ok) throw new Error('TTS API unavailable')

      const { audioContent } = await response.json()

      // Decode base64 to audio blob
      const binaryString = atob(audioContent)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)

      // Play audio
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      audioRef.current.src = url
      audioRef.current.onended = () => {
        URL.revokeObjectURL(url)
        isPlayingRef.current = false
        // Play next in queue if any
        const next = queueRef.current.shift()
        if (next) playAudio(next)
      }
      audioRef.current.onerror = () => {
        URL.revokeObjectURL(url)
        isPlayingRef.current = false
        // Fallback to speechSynthesis
        fallbackSpeak(options)
        const next = queueRef.current.shift()
        if (next) playAudio(next)
      }

      isPlayingRef.current = true
      await audioRef.current.play()
    } catch {
      // Fallback to browser TTS
      isPlayingRef.current = false
      fallbackSpeak(options)
    }
  }, [])

  const announce = useCallback((options: AnnounceOptions) => {
    if (isPlayingRef.current) {
      // Queue the announcement
      queueRef.current.push(options)
      return
    }
    playAudio(options)
  }, [playAudio])

  return { announce }
}

function fallbackSpeak(options: AnnounceOptions) {
  if (!('speechSynthesis' in window)) return

  const text = `Turno ${options.ticketNumber}, ${options.stationName}`
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-DO'
  utterance.rate = 0.9
  speechSynthesis.speak(utterance)
}
