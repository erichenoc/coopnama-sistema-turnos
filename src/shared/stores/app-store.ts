import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Organization, Branch, Service, Station } from '@/shared/types/domain'

interface AppState {
  organization: Organization | null
  branch: Branch | null
  services: Service[]
  stations: Station[]
  sidebarOpen: boolean
  setOrganization: (org: Organization | null) => void
  setBranch: (branch: Branch | null) => void
  setServices: (services: Service[]) => void
  setStations: (stations: Station[]) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      organization: null,
      branch: null,
      services: [],
      stations: [],
      sidebarOpen: true,
      setOrganization: (organization) => set({ organization }),
      setBranch: (branch) => set({ branch }),
      setServices: (services) => set({ services }),
      setStations: (stations) => set({ stations }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'coopnama-app-store',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
)
