'use server'

import { createClient } from '@/lib/supabase/server'

interface ExportFilters {
  organizationId: string
  branchId?: string
  dateFrom: string
  dateTo: string
}

/**
 * Export tickets data as CSV string
 */
export async function exportTicketsCSV(filters: ExportFilters): Promise<string> {
  const supabase = await createClient()

  let query = supabase
    .from('tickets')
    .select(`
      ticket_number,
      customer_name,
      status,
      priority,
      source,
      created_at,
      called_at,
      started_at,
      completed_at,
      wait_time_seconds,
      service_time_seconds,
      rating,
      sentiment,
      service:services!tickets_service_id_fkey(name),
      agent:users!tickets_agent_id_fkey(full_name)
    `)
    .eq('organization_id', filters.organizationId)
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
    .order('created_at', { ascending: false })

  if (filters.branchId && filters.branchId !== 'all') {
    query = query.eq('branch_id', filters.branchId)
  }

  const { data, error } = await query

  if (error || !data) return ''

  // Build CSV
  const headers = [
    'Turno', 'Cliente', 'Estado', 'Prioridad', 'Fuente',
    'Servicio', 'Agente', 'Creado', 'Llamado', 'Iniciado', 'Completado',
    'Espera (seg)', 'Servicio (seg)', 'Rating', 'Sentimiento'
  ]

  const rows = data.map((t: any) => [
    t.ticket_number,
    t.customer_name || '',
    t.status,
    t.priority,
    t.source || 'kiosk',
    t.service?.name || '',
    t.agent?.full_name || '',
    t.created_at || '',
    t.called_at || '',
    t.started_at || '',
    t.completed_at || '',
    t.wait_time_seconds || '',
    t.service_time_seconds || '',
    t.rating || '',
    t.sentiment || '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  return csvContent
}
