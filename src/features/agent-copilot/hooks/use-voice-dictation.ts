'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
    }
    length: number
  }
}

export function useVoiceDictation() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null)

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    setIsSupported(supported)
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) return

    try {
      const SpeechRecognition =
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition

      if (!SpeechRecognition) return

      const recognition = new (SpeechRecognition as new () => ReturnType<typeof createRecognition>)()
      recognition.lang = 'es-DO'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript
        }
        setTranscript(finalTranscript)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      setTranscript('')
    } catch {
      setIsListening(false)
    }
  }, [isSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return { isListening, transcript, startListening, stopListening, isSupported }
}

// Helper type for creating recognition instance
function createRecognition() {
  return {
    lang: '',
    continuous: false,
    interimResults: false,
    onresult: null as ((event: SpeechRecognitionEvent) => void) | null,
    onerror: null as (() => void) | null,
    onend: null as (() => void) | null,
    start: () => {},
    stop: () => {},
  }
}
