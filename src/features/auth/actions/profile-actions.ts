'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadAvatarAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autenticado' }

    const file = formData.get('avatar') as File
    if (!file || file.size === 0) return { error: 'No se selecciono archivo' }
    if (file.size > 2 * 1024 * 1024) return { error: 'El archivo no puede exceder 2MB' }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const allowed = ['png', 'jpg', 'jpeg', 'webp']
    if (!allowed.includes(ext)) return { error: 'Formato no soportado. Use PNG, JPG o WebP' }

    const filePath = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) return { error: uploadError.message }

    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Add cache-bust param to URL
    const avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (updateError) return { error: updateError.message }

    revalidatePath('/', 'layout')
    return { success: true, url: avatarUrl }
  } catch (err) {
    console.error('Avatar upload error:', err)
    return { error: 'Error al subir imagen de perfil' }
  }
}

export async function updateProfileAction(data: {
  full_name?: string
  phone?: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'No autenticado' }

    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('Profile update error:', err)
    return { error: 'Error al actualizar perfil' }
  }
}
