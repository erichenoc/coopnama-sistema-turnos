'use client'

import { useState, useEffect } from 'react'
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Select, Toggle,
} from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { toast } from 'sonner'
import {
  getAllSignageContent,
  saveSignageContent,
  deleteSignageContent,
  type SignageContent,
} from '@/features/tv-signage/services/signage-service'

interface Props {
  organizationId: string
}

interface FormData {
  id?: string
  content_type: 'image' | 'text' | 'video' | 'html'
  title: string
  content_url: string
  content_text: string
  display_duration_seconds: number
  is_active: boolean
}

const INITIAL_FORM: FormData = {
  content_type: 'text',
  title: '',
  content_url: '',
  content_text: '',
  display_duration_seconds: 10,
  is_active: true,
}

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'text', label: 'Texto' },
  { value: 'image', label: 'Imagen (URL)' },
  { value: 'video', label: 'Video (URL)' },
  { value: 'html', label: 'HTML personalizado' },
]

export function SignageContentManager({ organizationId }: Props) {
  const [items, setItems] = useState<SignageContent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadContent()
  }, [organizationId])

  async function loadContent() {
    setLoading(true)
    const data = await getAllSignageContent(organizationId)
    setItems(data)
    setLoading(false)
  }

  async function handleSave() {
    if (!formData.title?.trim()) {
      toast.error('El título es requerido')
      return
    }

    const result = await saveSignageContent({
      ...formData,
      organization_id: organizationId,
      content_url: formData.content_url || null,
      content_text: formData.content_text || null,
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(formData.id ? 'Contenido actualizado' : 'Contenido creado')
    setShowForm(false)
    setFormData(INITIAL_FORM)
    loadContent()
  }

  function handleEdit(item: SignageContent) {
    setFormData({
      id: item.id,
      content_type: item.content_type,
      title: item.title || '',
      content_url: item.content_url || '',
      content_text: item.content_text || '',
      display_duration_seconds: item.display_duration_seconds,
      is_active: item.is_active,
    })
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    const result = await deleteSignageContent(id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Contenido eliminado')
    setDeleteConfirmId(null)
    loadContent()
  }

  function handleCancel() {
    setShowForm(false)
    setFormData(INITIAL_FORM)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Cargando contenido...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Contenido TV / Signage</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona el contenido promocional que se muestra en las pantallas TV
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Agregar Contenido</Button>
        )}
      </div>

      {showForm && (
        <Card className="bg-neu-bg shadow-neu">
          <CardHeader>
            <CardTitle>{formData.id ? 'Editar Contenido' : 'Nuevo Contenido'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Promoción de Préstamos"
            />

            <Select
              label="Tipo de contenido"
              options={TYPE_OPTIONS}
              value={formData.content_type}
              onChange={(e) => setFormData({ ...formData, content_type: e.target.value as FormData['content_type'] })}
            />

            {(formData.content_type === 'image' || formData.content_type === 'video') && (
              <Input
                label="URL del contenido"
                value={formData.content_url}
                onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                placeholder="https://..."
              />
            )}

            {(formData.content_type === 'text' || formData.content_type === 'html') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.content_type === 'html' ? 'Código HTML' : 'Texto del mensaje'}
                </label>
                <textarea
                  value={formData.content_text}
                  onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-neu-bg shadow-neu-inset rounded-neu-sm text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
                  placeholder={formData.content_type === 'html' ? '<div>...</div>' : 'Escribe tu mensaje...'}
                />
              </div>
            )}

            <Input
              type="number"
              label="Duración en pantalla (segundos)"
              value={formData.display_duration_seconds}
              onChange={(e) => setFormData({ ...formData, display_duration_seconds: parseInt(e.target.value) || 10 })}
              min={3}
              max={120}
            />

            <Toggle
              label="Contenido activo"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="bg-neu-bg shadow-neu">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No hay contenido de signage. Agrega contenido para las pantallas TV.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="bg-neu-bg shadow-neu-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-coopnama-primary/10 flex items-center justify-center text-sm">
                      {item.content_type === 'image' ? '🖼️' : item.content_type === 'video' ? '🎬' : item.content_type === 'html' ? '🌐' : '📝'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{item.title || 'Sin título'}</p>
                      <p className="text-xs text-gray-500">
                        {item.content_type.toUpperCase()} · {item.display_duration_seconds}s
                        {!item.is_active && ' · Inactivo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(item)}>Editar</Button>
                    {deleteConfirmId === item.id ? (
                      <>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Confirmar</Button>
                        <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmId(item.id)} className="text-red-600">Eliminar</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
