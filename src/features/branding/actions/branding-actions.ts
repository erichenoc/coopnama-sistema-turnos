'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateBrandingAction(
  organizationId: string,
  data: {
    primary_color?: string
    secondary_color?: string
    logo_url?: string | null
  }
) {
  try {
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

    if (!profile || profile.organization_id !== organizationId) {
      return { error: 'No autorizado: organizacion no coincide' }
    }

    const { error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', organizationId)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err) {
    console.error('Branding update error:', err)
    return { error: 'Error al actualizar marca' }
  }
}

export async function uploadLogoAction(
  organizationId: string,
  formData: FormData
) {
  try {
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

    if (!profile || profile.organization_id !== organizationId) {
      return { error: 'No autorizado: organizacion no coincide' }
    }

    const file = formData.get('logo') as File

    if (!file || file.size === 0) {
      return { error: 'No se selecciono archivo' }
    }

    if (file.size > 2 * 1024 * 1024) {
      return { error: 'El archivo no puede exceder 2MB' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const allowedExts = ['png', 'jpg', 'jpeg', 'svg', 'webp']
    if (!allowedExts.includes(ext)) {
      return { error: 'Formato no soportado. Use PNG, JPG, SVG o WebP' }
    }

    const filePath = `${organizationId}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      return { error: uploadError.message }
    }

    const { data: publicUrl } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(filePath)

    // Update organization with new logo URL
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: publicUrl.publicUrl })
      .eq('id', organizationId)

    if (updateError) {
      return { error: updateError.message }
    }

    return { success: true, url: publicUrl.publicUrl }
  } catch (err) {
    console.error('Logo upload error:', err)
    return { error: 'Error al subir logo' }
  }
}
