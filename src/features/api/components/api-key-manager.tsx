'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { useOrg } from '@/shared/providers/org-provider'

interface APIKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  rate_limit_per_minute: number
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export function APIKeyManager() {
  const { organizationId } = useOrg()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read'])
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [organizationId])

  async function fetchKeys() {
    const supabase = createClient()
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    setKeys(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return
    setCreating(true)

    try {
      const response = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          scopes: newKeyScopes,
          organization_id: organizationId,
        }),
      })

      const result = await response.json()
      if (result.key) {
        setRevealedKey(result.key)
        setNewKeyName('')
        fetchKeys()
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    const supabase = createClient()
    await supabase.from('api_keys').update({ is_active: false }).eq('id', id)
    setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {revealedKey && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            Tu API key ha sido creada. Copiala ahora, no se mostrara de nuevo.
          </p>
          <code className="block p-3 bg-white rounded border font-mono text-sm break-all">
            {revealedKey}
          </code>
          <div className="mt-2 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(revealedKey)
              }}
            >
              Copiar
            </Button>
            <Button variant="ghost" onClick={() => setRevealedKey(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Crear API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Mi integracion"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permisos</label>
              <div className="flex gap-3">
                {['read', 'write'].map(scope => (
                  <label key={scope} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyScopes.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKeyScopes([...newKeyScopes, scope])
                        } else {
                          setNewKeyScopes(newKeyScopes.filter(s => s !== scope))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{scope}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
            >
              {creating ? <Spinner size="sm" /> : 'Crear Key'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys ({keys.filter(k => k.is_active).length} activas)</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-center py-6 text-gray-400">No hay API keys</p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    key.is_active ? 'bg-gray-50' : 'bg-gray-50/50 opacity-60'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{key.key_prefix}...</p>
                    <div className="flex gap-2 mt-1">
                      {key.scopes.map(scope => (
                        <span key={scope} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {scope}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">
                        {key.rate_limit_per_minute} req/min
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {key.last_used_at && (
                      <span className="text-xs text-gray-400">
                        Usado: {new Date(key.last_used_at).toLocaleDateString('es-DO')}
                      </span>
                    )}
                    {key.is_active ? (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Revocar
                      </button>
                    ) : (
                      <span className="text-xs text-red-500">Revocada</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentacion API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">Base URL: <code className="bg-gray-100 px-2 py-0.5 rounded">/api/v1</code></p>
            <div className="space-y-2">
              <p className="font-medium text-gray-800">Endpoints:</p>
              <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs space-y-1">
                <p><span className="text-green-600">GET</span> /api/v1/tickets - Listar turnos</p>
                <p><span className="text-blue-600">POST</span> /api/v1/tickets - Crear turno</p>
                <p><span className="text-green-600">GET</span> /api/v1/queue?branch_id=X - Estado de cola</p>
                <p><span className="text-green-600">GET</span> /api/v1/appointments - Listar citas</p>
                <p><span className="text-blue-600">POST</span> /api/v1/appointments - Crear cita</p>
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-800">Autenticacion:</p>
              <code className="block bg-gray-900 text-green-400 p-3 rounded-lg text-xs mt-1">
                Authorization: Bearer ck_tu_api_key_aqui
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
