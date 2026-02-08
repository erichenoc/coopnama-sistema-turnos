import type { Priority, Service, TicketWithRelations } from '@/shared/types/domain'

// Re-export domain types used across copilot feature
export type { Priority, Service, TicketWithRelations }

// ============================================
// COPILOT PANEL PROPS
// ============================================

export interface CopilotCallbacks {
  onAppendToNotes: (text: string) => void
  onReplaceNotes: (text: string) => void
  onTriggerTransfer: (serviceId: string, reason: string) => void
  onTriggerComplete: (summary: string) => void
  onEscalatePriority: (newPriority: Priority) => void
}

export interface CopilotContext {
  organizationId: string
  branchId: string
  agentId: string | null
  waitingCount: number
  serviceTimerSeconds: number
  services: Service[]
}

export interface CopilotPanelProps {
  ticket: TicketWithRelations | null
  notes: string
  callbacks: CopilotCallbacks
  context: CopilotContext
}

// ============================================
// TAB TYPES
// ============================================

export type CopilotTab = 'chat' | 'member' | 'kb' | 'actions'

// ============================================
// MEMBER 360 TYPES
// ============================================

export interface MemberProfile {
  id: string
  full_name: string
  cedula: string | null
  phone: string | null
  email: string | null
  member_number: string | null
  priority_level: number
  priority_reason: string | null
  date_of_birth: string | null
  total_visits: number
  last_visit_at: string | null
  notes: string | null
  created_at: string
}

export interface MemberVisit {
  ticket_number: string
  service: { name: string } | null
  created_at: string
  rating: number | null
  feedback_comment: string | null
  feedback_sentiment: string | null
  wait_time_seconds: number | null
  service_time_seconds: number | null
}

export type SentimentTrend = 'improving' | 'stable' | 'declining' | null

// ============================================
// AGENT METRICS
// ============================================

export interface AgentMetrics {
  todayServed: number
  avgServiceTime: number | null
  avgRating: number | null
  totalRatings: number
}

// ============================================
// SLA TIMER
// ============================================

export type SLAPhase = 'ok' | 'warning' | 'critical' | 'breached'

export interface SLATimerState {
  phase: SLAPhase
  remainingSeconds: number | null
  thresholdMinutes: number | null
  warningMinutes: number | null
  criticalMinutes: number | null
}

// ============================================
// KNOWLEDGE BASE
// ============================================

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  entry_type?: string
  service_id?: string | null
}

// ============================================
// FOLLOW-UP TASKS
// ============================================

export interface FollowUpTask {
  id: string
  ticket_id: string
  agent_id: string
  member_id: string | null
  task_description: string
  priority: 'low' | 'medium' | 'high'
  is_completed: boolean
  completed_at: string | null
  due_date: string | null
  created_at: string
}

// ============================================
// SIMILAR CASES
// ============================================

export interface SimilarCase {
  ticketNumber: string
  serviceName: string
  resolution: string | null
  rating: number | null
  serviceTimeSeconds: number | null
  date: string
}

// ============================================
// TRANSFER RECOMMENDATION
// ============================================

export interface TransferRecommendation {
  serviceId: string
  serviceName: string
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

// ============================================
// CROSS-SELL
// ============================================

export interface CrossSellSuggestion {
  serviceName: string
  reason: string
}
