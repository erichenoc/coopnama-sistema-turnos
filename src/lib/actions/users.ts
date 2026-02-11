'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TeamUser {
  id: string
  full_name: string
  role: string
  is_active: boolean
  branch_id: string | null
  phone: string | null
  employee_id: string | null
  avatar_url: string | null
  created_at: string
  branch?: { name: string } | null
}

type UserRole = 'superadmin' | 'owner' | 'admin' | 'branch_manager' | 'supervisor' | 'agent' | 'receptionist' | 'kiosk'

// Helper: verify caller is admin
async function verifyAdmin(supabase: any, organizationId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== organizationId) {
    return { error: 'No autorizado: organizacion no coincide' }
  }

  if (!['superadmin', 'owner', 'admin'].includes(profile.role)) {
    return { error: 'No autorizado: se requiere rol de administrador' }
  }

  return { user, profile }
}

export async function getTeamUsersAction(
  organizationId: string
): Promise<{ data?: TeamUser[]; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  // Verify user belongs to organization
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== organizationId) {
    return { error: 'No autorizado: organizacion no coincide' }
  }

  // Only admin+ can see team
  if (!['superadmin', 'owner', 'admin', 'branch_manager'].includes(profile.role)) {
    return { error: 'No autorizado: permisos insuficientes' }
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role, is_active, branch_id, phone, employee_id, avatar_url, created_at, branch:branches(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) return { error: `Error al obtener usuarios: ${error.message}` }

  // Supabase returns branch as array from join, normalize to single object
  const normalized = (data || []).map((u: Record<string, unknown>) => ({
    ...u,
    branch: Array.isArray(u.branch) ? u.branch[0] || null : u.branch,
  })) as TeamUser[]

  return { data: normalized }
}

export async function updateUserRoleAction(
  organizationId: string,
  userId: string,
  role: UserRole
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase, organizationId)
  if ('error' in auth) return { error: auth.error as string }

  // Prevent changing own role
  if (auth.user.id === userId) {
    return { error: 'No puedes cambiar tu propio rol' }
  }

  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('organization_id', organizationId)

  if (error) return { error: `Error al actualizar rol: ${error.message}` }

  revalidatePath('/settings')
  return {}
}

export async function assignUserBranchAction(
  organizationId: string,
  userId: string,
  branchId: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase, organizationId)
  if ('error' in auth) return { error: auth.error as string }

  const { error } = await supabase
    .from('users')
    .update({ branch_id: branchId, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('organization_id', organizationId)

  if (error) return { error: `Error al asignar sucursal: ${error.message}` }

  revalidatePath('/settings')
  return {}
}

export async function toggleUserActiveAction(
  organizationId: string,
  userId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase, organizationId)
  if ('error' in auth) return { error: auth.error as string }

  // Prevent deactivating yourself
  if (auth.user.id === userId) {
    return { error: 'No puedes desactivarte a ti mismo' }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('organization_id', organizationId)

  if (error) return { error: `Error al actualizar estado: ${error.message}` }

  revalidatePath('/settings')
  return {}
}

export async function deleteTeamUserAction(
  organizationId: string,
  userId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const auth = await verifyAdmin(supabase, organizationId)
  if ('error' in auth) return { error: auth.error as string }

  // Prevent deleting yourself
  if (auth.user.id === userId) {
    return { error: 'No puedes eliminarte a ti mismo' }
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('organization_id', organizationId)

  if (error) return { error: `Error al eliminar usuario: ${error.message}` }

  revalidatePath('/settings')
  return {}
}

export async function getBranchesForAssignment(
  organizationId: string
): Promise<{ data?: { id: string; name: string }[]; error?: string }> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado' }

  // Verify user belongs to organization
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== organizationId) {
    return { error: 'No autorizado: organizacion no coincide' }
  }

  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  if (error) return { error: `Error al obtener sucursales: ${error.message}` }
  return { data }
}
