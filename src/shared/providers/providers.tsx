'use client'

import { OrgProvider } from './org-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      {children}
    </OrgProvider>
  )
}
