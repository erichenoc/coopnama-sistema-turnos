'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { useOrg } from '@/shared/providers/org-provider'

interface Domain {
  id: string
  domain: string
  is_verified: boolean
  ssl_status: string
  created_at: string
}

export function DomainManager() {
  const { organizationId } = useOrg()
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchDomains()
  }, [organizationId])

  async function fetchDomains() {
    const supabase = createClient()
    const { data } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    setDomains(data || [])
    setLoading(false)
  }

  async function handleAddDomain() {
    if (!newDomain.trim()) return

    setAdding(true)
    const supabase = createClient()
    const { error } = await supabase.from('custom_domains').insert({
      organization_id: organizationId,
      domain: newDomain.trim().toLowerCase(),
    })

    if (!error) {
      setNewDomain('')
      fetchDomains()
    }
    setAdding(false)
  }

  async function handleDeleteDomain(id: string) {
    const supabase = createClient()
    await supabase.from('custom_domains').delete().eq('id', id)
    setDomains(prev => prev.filter(d => d.id !== id))
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
      <Card>
        <CardHeader>
          <CardTitle>Dominios Personalizados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300 mb-4">
            Configura un dominio personalizado para que tus clientes accedan al sistema con tu propia marca.
          </p>

          <div className="flex gap-3 mb-6">
            <Input
              placeholder="turnos.tuempresa.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleAddDomain}
              disabled={adding || !newDomain.trim()}
            >
              {adding ? <Spinner size="sm" /> : 'Agregar'}
            </Button>
          </div>

          {domains.length === 0 ? (
            <p className="text-center py-6 text-gray-300">No hay dominios configurados</p>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-4 bg-white/[0.04] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{domain.domain}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      domain.is_verified ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-300'
                    }`}>
                      {domain.is_verified ? 'Verificado' : 'Pendiente'}
                    </span>
                    {domain.is_verified && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        domain.ssl_status === 'active' ? 'bg-green-500/10 text-green-300' : 'bg-white/[0.06] text-gray-300'
                      }`}>
                        SSL: {domain.ssl_status}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDomain(domain.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuracion DNS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300 mb-4">
            Para verificar tu dominio, agrega el siguiente registro CNAME en tu proveedor DNS:
          </p>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <p>Tipo: CNAME</p>
            <p>Nombre: turnos (o tu subdominio)</p>
            <p>Valor: cname.vercel-dns.com</p>
          </div>
          <p className="text-xs text-gray-300 mt-2">
            La verificacion puede tardar hasta 24 horas despues de configurar el DNS.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
