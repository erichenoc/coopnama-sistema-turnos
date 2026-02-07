'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SignageContent {
  id: string
  organization_id: string
  branch_id: string | null
  content_type: 'image' | 'text' | 'video' | 'html'
  title: string | null
  content_url: string | null
  content_text: string | null
  display_duration_seconds: number
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export async function getSignageContent(
  organizationId: string,
  branchId?: string
): Promise<SignageContent[]> {
  const supabase = await createClient()

  let query = supabase
    .from('signage_content')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (branchId) {
    // Get content for specific branch OR org-wide (null branch_id)
    query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
  }

  // Filter by schedule
  const now = new Date().toISOString()
  query = query.or(`starts_at.is.null,starts_at.lte.${now}`)
  query = query.or(`ends_at.is.null,ends_at.gte.${now}`)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching signage content:', error)
    return []
  }

  return (data || []) as SignageContent[]
}

export async function getAllSignageContent(
  organizationId: string
): Promise<SignageContent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('signage_content')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching signage content:', error)
    return []
  }

  return (data || []) as SignageContent[]
}

export async function saveSignageContent(
  content: Partial<SignageContent> & { organization_id: string }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    if (content.id) {
      const { error } = await supabase
        .from('signage_content')
        .update(content)
        .eq('id', content.id)
        .eq('organization_id', content.organization_id)

      if (error) return { error: error.message }
    } else {
      const { data: lastItem } = await supabase
        .from('signage_content')
        .select('sort_order')
        .eq('organization_id', content.organization_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { error } = await supabase.from('signage_content').insert({
        ...content,
        sort_order: lastItem ? lastItem.sort_order + 1 : 0,
      })

      if (error) return { error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    console.error('Error saving signage content:', err)
    return { error: 'Error al guardar contenido' }
  }
}

export async function deleteSignageContent(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('signage_content')
      .delete()
      .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    console.error('Error deleting signage content:', err)
    return { error: 'Error al eliminar contenido' }
  }
}
