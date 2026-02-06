'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { useOrg } from '@/shared/providers/org-provider'

interface CSSEditorProps {
  initialCSS: string
  faviconUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
}

export function CSSEditor({ initialCSS, faviconUrl, metaTitle, metaDescription }: CSSEditorProps) {
  const { organizationId } = useOrg()
  const [css, setCSS] = useState(initialCSS || '')
  const [favicon, setFavicon] = useState(faviconUrl || '')
  const [title, setTitle] = useState(metaTitle || '')
  const [description, setDescription] = useState(metaDescription || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('organizations')
      .update({
        custom_css: css || null,
        favicon_url: favicon || null,
        meta_title: title || null,
        meta_description: description || null,
      })
      .eq('id', organizationId)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Metadatos del Sitio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulo del Sitio</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mi Sistema de Turnos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sistema de gestion de turnos y citas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL del Favicon</label>
            <Input
              value={favicon}
              onChange={(e) => setFavicon(e.target.value)}
              placeholder="https://example.com/favicon.ico"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSS Personalizado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            Agrega CSS personalizado para ajustar la apariencia de tu sistema.
            Usa variables CSS como --brand-primary para colores.
          </p>
          <textarea
            value={css}
            onChange={(e) => setCSS(e.target.value)}
            className="w-full h-48 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-0 focus:ring-2 focus:ring-coopnama-primary"
            placeholder={`/* Ejemplo */\n.btn-primary {\n  border-radius: 20px;\n}\n\n:root {\n  --brand-primary: #ff6600;\n}`}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  )
}
