import { create } from 'zustand'
import type { CopilotTab, SLAPhase, FollowUpTask } from '../types'

interface CopilotState {
  activeTab: CopilotTab
  setActiveTab: (tab: CopilotTab) => void

  slaPhase: SLAPhase
  setSLAPhase: (phase: SLAPhase) => void

  followUpTasks: FollowUpTask[]
  setFollowUpTasks: (tasks: FollowUpTask[]) => void
  addFollowUp: (task: FollowUpTask) => void
  toggleFollowUp: (id: string) => void
  removeFollowUp: (id: string) => void

  postServiceSummary: string | null
  setPostServiceSummary: (summary: string | null) => void

  newAgentMode: boolean
  toggleNewAgentMode: () => void

  lastCopySuggestion: string | null
  setLastCopySuggestion: (text: string | null) => void
}

export const useCopilotStore = create<CopilotState>((set) => ({
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),

  slaPhase: 'ok',
  setSLAPhase: (phase) => set({ slaPhase: phase }),

  followUpTasks: [],
  setFollowUpTasks: (tasks) => set({ followUpTasks: tasks }),
  addFollowUp: (task) =>
    set((state) => ({ followUpTasks: [...state.followUpTasks, task] })),
  toggleFollowUp: (id) =>
    set((state) => ({
      followUpTasks: state.followUpTasks.map((t) =>
        t.id === id ? { ...t, is_completed: !t.is_completed } : t
      ),
    })),
  removeFollowUp: (id) =>
    set((state) => ({
      followUpTasks: state.followUpTasks.filter((t) => t.id !== id),
    })),

  postServiceSummary: null,
  setPostServiceSummary: (summary) => set({ postServiceSummary: summary }),

  newAgentMode: false,
  toggleNewAgentMode: () =>
    set((state) => ({ newAgentMode: !state.newAgentMode })),

  lastCopySuggestion: null,
  setLastCopySuggestion: (text) => set({ lastCopySuggestion: text }),
}))
