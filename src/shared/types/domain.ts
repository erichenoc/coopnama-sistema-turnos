/**
 * COOPNAMA Sistema de Turnos
 * Domain Types - Tipos de dominio del sistema
 */

// ============================================
// ENUMS Y TIPOS BASE
// ============================================

export type TicketStatus =
  | 'waiting'     // En espera
  | 'called'      // Llamado
  | 'serving'     // Atendiendo
  | 'on_hold'     // En pausa
  | 'transferred' // Transferido
  | 'completed'   // Completado
  | 'cancelled'   // Cancelado
  | 'no_show'     // No se presentó

export type Priority = 0 | 1 | 2 | 3
export type PriorityName = 'normal' | 'preferential' | 'vip' | 'urgent'

export type UserRole =
  | 'superadmin'
  | 'owner'
  | 'admin'
  | 'branch_manager'
  | 'supervisor'
  | 'agent'
  | 'receptionist'
  | 'kiosk'

export type TicketSource = 'whatsapp' | 'kiosk' | 'web' | 'reception' | 'app'

export type StationType = 'general' | 'priority' | 'specialized'

export type ServiceCategory = 'creditos' | 'ahorros' | 'servicios' | 'general'

export type UserStatus = 'online' | 'offline' | 'busy' | 'away'

// ============================================
// CONSTANTES Y MAPEOS
// ============================================

export const PRIORITY_MAP: Record<PriorityName, Priority> = {
  normal: 0,
  preferential: 1,
  vip: 2,
  urgent: 3,
}

export const PRIORITY_NAME_MAP: Record<Priority, PriorityName> = {
  0: 'normal',
  1: 'preferential',
  2: 'vip',
  3: 'urgent',
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  waiting: 'En Espera',
  called: 'Llamado',
  serving: 'Atendiendo',
  on_hold: 'En Pausa',
  transferred: 'Transferido',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No Presentado',
}

export const PRIORITY_LABELS: Record<PriorityName, string> = {
  normal: 'Normal',
  preferential: 'Preferencial',
  vip: 'VIP',
  urgent: 'Urgente',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Administrador',
  owner: 'Propietario',
  admin: 'Administrador',
  branch_manager: 'Gerente de Sucursal',
  supervisor: 'Supervisor',
  agent: 'Agente',
  receptionist: 'Recepcionista',
  kiosk: 'Kiosk',
}

// ============================================
// INTERFACES DE ENTIDADES
// ============================================

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  secondary_color: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  organization_id: string
  name: string
  code: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  opening_time: string
  closing_time: string
  working_days: number[]
  max_capacity_per_hour: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  organization_id: string
  name: string
  code: string
  description: string | null
  icon: string | null
  color: string
  category: ServiceCategory
  avg_duration_minutes: number
  requires_appointment: boolean
  requires_member_id: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Station {
  id: string
  branch_id: string
  name: string
  station_number: number
  station_type: StationType
  display_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  organization_id: string
  cedula: string | null
  full_name: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  member_number: string | null
  priority_level: Priority
  priority_reason: string | null
  date_of_birth: string | null
  notes: string | null
  total_visits: number
  last_visit_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string
  branch_id: string | null
  role: UserRole
  full_name: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  phone: string | null
  employee_id: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  organization_id: string
  branch_id: string
  service_id: string
  member_id: string | null
  station_id: string | null
  agent_id: string | null
  ticket_number: string
  daily_sequence: number
  customer_name: string | null
  customer_phone: string | null
  customer_cedula: string | null
  status: TicketStatus
  priority: Priority
  priority_reason: string | null
  source: TicketSource
  created_at: string
  scheduled_for: string | null
  called_at: string | null
  started_at: string | null
  completed_at: string | null
  wait_time_seconds: number | null
  service_time_seconds: number | null
  recall_count: number
  notes: string | null
  transferred_from_ticket_id: string | null
  transferred_from_service_id: string | null
  transfer_reason: string | null
  rating: number | null
  feedback_comment: string | null
  feedback_sentiment: 'positive' | 'neutral' | 'negative' | null
}

export interface TicketHistory {
  id: string
  ticket_id: string
  previous_status: TicketStatus | null
  new_status: TicketStatus
  changed_by: string | null
  station_id: string | null
  notes: string | null
  created_at: string
}

export interface AgentSession {
  id: string
  station_id: string
  agent_id: string
  branch_id: string
  started_at: string
  ended_at: string | null
  break_started_at: string | null
  break_ended_at: string | null
  is_active: boolean
  is_on_break: boolean
  tickets_served: number
  total_service_time_seconds: number
  avg_service_time_seconds: number | null
}

// ============================================
// TIPOS CON RELACIONES (para queries con joins)
// ============================================

export interface TicketWithRelations extends Ticket {
  service?: Service
  station?: Station
  agent?: User
  member?: Member
}

export interface StationWithAgent extends Station {
  agent_session?: AgentSession & { agent?: User }
  current_ticket?: Ticket
}

export interface AgentSessionWithRelations extends AgentSession {
  agent?: User
  station?: Station
}

// ============================================
// TIPOS PARA INPUT (crear/actualizar)
// ============================================

export interface CreateTicketInput {
  organization_id: string
  branch_id: string
  service_id: string
  customer_name?: string
  customer_cedula?: string
  customer_phone?: string
  priority?: Priority
  priority_reason?: string
  source?: TicketSource
  member_id?: string
}

export interface UpdateTicketInput {
  status?: TicketStatus
  station_id?: string
  agent_id?: string
  notes?: string
  rating?: number
  feedback_comment?: string
}

export interface CreateAgentSessionInput {
  station_id: string
  agent_id: string
  branch_id: string
}

// ============================================
// TIPOS PARA ESTADÍSTICAS
// ============================================

export interface DailyStats {
  total_tickets: number
  completed_tickets: number
  waiting_tickets: number
  serving_tickets: number
  no_show_tickets: number
  cancelled_tickets: number
  avg_wait_time_seconds: number | null
  avg_service_time_seconds: number | null
}

export interface ServiceStats {
  service_id: string
  service_name: string
  count: number
  percentage: number
}

export interface HourlyStats {
  hour: number
  count: number
}

// ============================================
// TIPOS PARA UI
// ============================================

export interface QueueTicket {
  id: string
  number: string
  service: string
  serviceCode: string
  status: TicketStatus
  priority: PriorityName
  customerName: string | null
  waitTime: string
  createdAt: string
}

export interface ActiveAgent {
  id: string
  name: string
  station: string
  stationNumber: number
  status: UserStatus
  currentTicket: string | null
  service: string
}

export interface TVDisplayTicket {
  number: string
  station: string
  service: string
  calledAt: string
  isNew: boolean
}

export interface ServiceOption {
  id: string
  name: string
  code: string
  icon: string
  description: string
  waitTime: number
  color: string
}
