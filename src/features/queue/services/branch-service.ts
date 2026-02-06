/**
 * COOPNAMA Sistema de Turnos
 * Branch Service - Operaciones para sucursales, servicios y estaciones
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Branch,
  Service,
  Station,
  StationWithAgent,
  ServiceOption,
} from '@/shared/types/domain'

// ============================================
// BRANCHES (SUCURSALES)
// ============================================

/**
 * Obtiene todas las sucursales de una organización
 */
export async function getBranches(organizationId: string): Promise<Branch[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching branches:', error)
    throw new Error(`Error al obtener sucursales: ${error.message}`)
  }

  return (data || []) as Branch[]
}

/**
 * Obtiene una sucursal por ID
 */
export async function getBranchById(branchId: string): Promise<Branch | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching branch:', error)
    throw new Error(`Error al obtener sucursal: ${error.message}`)
  }

  return data as Branch
}

/**
 * Obtiene la sucursal por defecto (primera activa)
 * Útil para kiosk y TV display
 */
export async function getDefaultBranch(): Promise<Branch | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching default branch:', error)
    throw new Error(`Error al obtener sucursal: ${error.message}`)
  }

  return data as Branch | null
}

// ============================================
// SERVICES (SERVICIOS)
// ============================================

/**
 * Obtiene todos los servicios de una organización
 */
export async function getServices(organizationId: string): Promise<Service[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Error fetching services:', error)
    throw new Error(`Error al obtener servicios: ${error.message}`)
  }

  return (data || []) as Service[]
}

/**
 * Obtiene servicios disponibles en una sucursal
 */
export async function getBranchServices(branchId: string): Promise<Service[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('branch_services')
    .select(`
      service:services(*)
    `)
    .eq('branch_id', branchId)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching branch services:', error)
    throw new Error(`Error al obtener servicios: ${error.message}`)
  }

  // Extraer los servicios del join y filtrar activos
  const services = data
    ?.map((bs) => bs.service as unknown as Service)
    .filter((s) => s && s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

  return services || []
}

/**
 * Obtiene servicios activos para el kiosk (con formato para UI)
 */
export async function getServicesForKiosk(branchId: string): Promise<ServiceOption[]> {
  const services = await getBranchServices(branchId)

  return services.map((service) => ({
    id: service.id,
    name: service.name,
    code: service.code,
    icon: service.icon || '📋',
    description: service.description || '',
    waitTime: service.avg_duration_minutes,
    color: service.color,
  }))
}

/**
 * Obtiene un servicio por ID
 */
export async function getServiceById(serviceId: string): Promise<Service | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching service:', error)
    throw new Error(`Error al obtener servicio: ${error.message}`)
  }

  return data as Service
}

/**
 * Obtiene un servicio por código
 */
export async function getServiceByCode(
  organizationId: string,
  code: string
): Promise<Service | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('code', code)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching service:', error)
    throw new Error(`Error al obtener servicio: ${error.message}`)
  }

  return data as Service
}

// ============================================
// STATIONS (VENTANILLAS)
// ============================================

/**
 * Obtiene todas las estaciones de una sucursal
 */
export async function getStations(branchId: string): Promise<Station[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('station_number')

  if (error) {
    console.error('Error fetching stations:', error)
    throw new Error(`Error al obtener estaciones: ${error.message}`)
  }

  return (data || []) as Station[]
}

/**
 * Obtiene estaciones con información del agente actual
 */
export async function getStationsWithAgents(branchId: string): Promise<StationWithAgent[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('stations')
    .select(`
      *,
      agent_session:agent_sessions(
        *,
        agent:users(*)
      )
    `)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('station_number')

  if (error) {
    console.error('Error fetching stations with agents:', error)
    throw new Error(`Error al obtener estaciones: ${error.message}`)
  }

  // Filtrar sesiones activas
  return (data || []).map((station) => {
    const activeSessions = (station.agent_session || []).filter(
      (s: { is_active: boolean }) => s.is_active
    )
    return {
      ...station,
      agent_session: activeSessions[0] || null,
    }
  }) as StationWithAgent[]
}

/**
 * Obtiene una estación por ID
 */
export async function getStationById(stationId: string): Promise<Station | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('id', stationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching station:', error)
    throw new Error(`Error al obtener estación: ${error.message}`)
  }

  return data as Station
}

// ============================================
// AGENT SESSIONS
// ============================================

/**
 * Inicia una sesión de agente en una estación
 */
export async function startAgentSession(
  stationId: string,
  agentId: string,
  branchId: string
): Promise<void> {
  const supabase = createClient()

  // Cerrar sesiones anteriores del agente
  await supabase
    .from('agent_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('agent_id', agentId)
    .eq('is_active', true)

  // Cerrar sesiones anteriores en la estación
  await supabase
    .from('agent_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('station_id', stationId)
    .eq('is_active', true)

  // Crear nueva sesión
  const { error } = await supabase.from('agent_sessions').insert({
    station_id: stationId,
    agent_id: agentId,
    branch_id: branchId,
    is_active: true,
  })

  if (error) {
    console.error('Error starting agent session:', error)
    throw new Error(`Error al iniciar sesión: ${error.message}`)
  }
}

/**
 * Finaliza la sesión de un agente
 */
export async function endAgentSession(agentId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('agent_sessions')
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq('agent_id', agentId)
    .eq('is_active', true)

  if (error) {
    console.error('Error ending agent session:', error)
    throw new Error(`Error al finalizar sesión: ${error.message}`)
  }
}

/**
 * Obtiene la sesión activa de un agente
 */
export async function getActiveAgentSession(agentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('agent_sessions')
    .select(`
      *,
      station:stations(*),
      branch:branches(*)
    `)
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('Error fetching agent session:', error)
    throw new Error(`Error al obtener sesión: ${error.message}`)
  }

  return data
}
