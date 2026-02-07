'use server'

import { createClient } from '@/lib/supabase/server'

export interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
  user?: { full_name: string; email: string } | null
}

export async function getAuditLogs(
  organizationId: string,
  filters?: {
    action?: string
    entity_type?: string
    user_id?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }
): Promise<{ data: AuditEntry[]; total: number }> {
  const supabase = await createClient()
  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  let query = supabase
    .from('audit_log')
    .select('*, user:users!audit_log_user_id_fkey(full_name, email)', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters?.action) query = query.eq('action', filters.action)
  if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type)
  if (filters?.user_id) query = query.eq('user_id', filters.user_id)
  if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom)
  if (filters?.dateTo) query = query.lte('created_at', filters.dateTo)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching audit logs:', error)
    return { data: [], total: 0 }
  }

  return { data: (data || []) as unknown as AuditEntry[], total: count || 0 }
}

export async function logAuditEvent(
  organizationId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string | null
) {
  const supabase = await createClient()

  await supabase.from('audit_log').insert({
    organization_id: organizationId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: details || {},
    ip_address: ipAddress || null,
  })
}

export async function getAuditActions(organizationId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('audit_log')
    .select('action')
    .eq('organization_id', organizationId)
    .order('action')

  const unique = [...new Set((data || []).map(d => d.action))]
  return unique
}
