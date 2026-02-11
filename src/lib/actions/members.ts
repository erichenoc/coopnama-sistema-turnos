'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Member } from '@/shared/types/domain'

export interface CreateMemberInput {
  organization_id: string
  full_name: string
  first_name?: string
  last_name?: string
  cedula?: string
  phone?: string
  email?: string
  address?: string
  member_number?: string
  priority_level?: number
  priority_reason?: string
  date_of_birth?: string
  notes?: string
}

export async function createMemberAction(
  input: CreateMemberInput
): Promise<{ data?: Member; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Verify user belongs to the organization
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== input.organization_id) {
    return { error: 'No autorizado: organizacion no coincide' }
  }

  const { data, error } = await supabase
    .from('members')
    .insert({
      organization_id: input.organization_id,
      full_name: input.full_name,
      first_name: input.first_name || null,
      last_name: input.last_name || null,
      cedula: input.cedula || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      member_number: input.member_number || null,
      priority_level: input.priority_level || 0,
      priority_reason: input.priority_reason || null,
      date_of_birth: input.date_of_birth || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) return { error: `Error al crear miembro: ${error.message}` }

  revalidatePath('/members')
  return { data: data as Member }
}

export async function updateMemberAction(
  memberId: string,
  updates: Partial<CreateMemberInput>
): Promise<{ data?: Member; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Get member to verify organization
  const { data: member } = await supabase
    .from('members')
    .select('organization_id')
    .eq('id', memberId)
    .single()

  if (!member) {
    return { error: 'Miembro no encontrado' }
  }

  // Verify user belongs to the organization
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== member.organization_id) {
    return { error: 'No autorizado: organizacion no coincide' }
  }

  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single()

  if (error) return { error: `Error al actualizar miembro: ${error.message}` }

  revalidatePath('/members')
  return { data: data as Member }
}

export async function deleteMemberAction(memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Get member to verify organization
  const { data: member } = await supabase
    .from('members')
    .select('organization_id')
    .eq('id', memberId)
    .single()

  if (!member) {
    return { error: 'Miembro no encontrado' }
  }

  // Verify user belongs to the organization
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== member.organization_id) {
    return { error: 'No autorizado: organizacion no coincide' }
  }

  const { error } = await supabase
    .from('members')
    .update({ is_active: false })
    .eq('id', memberId)

  if (error) return { error: `Error al eliminar miembro: ${error.message}` }

  revalidatePath('/members')
  return {}
}

export async function getMembersAction(
  organizationId: string,
  search?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: Member[]; total: number }> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  let query = supabase
    .from('members')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,cedula.ilike.%${search}%,phone.ilike.%${search}%,member_number.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query
    .order('full_name')
    .range(offset, offset + limit - 1)

  if (error) return { data: [], total: 0 }
  return { data: (data || []) as Member[], total: count || 0 }
}

export async function searchMemberAction(
  organizationId: string,
  search: string
): Promise<Member[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(
      `full_name.ilike.%${search}%,cedula.ilike.%${search}%,phone.ilike.%${search}%,member_number.ilike.%${search}%`
    )
    .order('full_name')
    .limit(10)

  if (error) return []
  return (data || []) as Member[]
}

export async function getMemberByIdAction(memberId: string): Promise<Member | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (error) return null
  return data as Member
}
