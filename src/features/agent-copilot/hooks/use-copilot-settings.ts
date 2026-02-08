'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'coopnama_copilot_settings'

interface CopilotSettings {
  newAgentMode: boolean
  autoKBSearch: boolean
}

const defaults: CopilotSettings = {
  newAgentMode: false,
  autoKBSearch: true,
}

export function useCopilotSettings() {
  const [settings, setSettings] = useState<CopilotSettings>(defaults)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setSettings(JSON.parse(stored))
    } catch {
      // Use defaults
    }
  }, [])

  const update = (partial: Partial<CopilotSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }

  return {
    newAgentMode: settings.newAgentMode,
    toggleNewAgentMode: () => update({ newAgentMode: !settings.newAgentMode }),
    autoKBSearch: settings.autoKBSearch,
    toggleAutoKBSearch: () => update({ autoKBSearch: !settings.autoKBSearch }),
  }
}
