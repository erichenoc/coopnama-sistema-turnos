'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { StatusBadge, type TicketStatus } from '@/shared/components/badge'
import Image from 'next/image'
import { LOGO_URL } from '@/shared/components/coopnama-logo'
import Link from 'next/link'

interface MemberInfo {
  id: string
  full_name: string
  cedula: string
  member_number: string | null
}

interface TicketRecord {
  id: string
  ticket_number: string
  status: TicketStatus
  created_at: string
  rating: number | null
  service: { name: string } | null
}

export default function PortalPage() {
  const [cedula, setCedula] = useState('')
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!cedula.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('members')
      .select('id, full_name, cedula, member_number')
      .eq('cedula', cedula.trim().replace(/-/g, ''))
      .maybeSingle()

    if (fetchError || !data) {
      setError('No se encontro un miembro con esa cedula')
      setLoading(false)
      return
    }

    setMember(data as MemberInfo)

    // Fetch ticket history
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('id, ticket_number, status, created_at, rating, service:services!tickets_service_id_fkey(name)')
      .eq('member_id', data.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setTickets((ticketData || []) as unknown as TicketRecord[])
    setLoading(false)
  }

  const handleLogout = () => {
    setMember(null)
    setTickets([])
    setCedula('')
  }

  return (
    <div className="min-h-screen bg-neu-bg">
      <header className="bg-coopnama-primary text-white py-6 px-8 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src={LOGO_URL} alt="COOPNAMA" width={40} height={40} className="rounded-lg object-contain" priority />
            <div>
              <span className="font-bold text-xl">Portal del Cliente</span>
              <p className="text-blue-200 text-sm">COOPNAMA</p>
            </div>
          </div>
          {member && (
            <Button variant="secondary" onClick={handleLogout}>Salir</Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {!member ? (
          <div className="max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Acceder</h1>
            <p className="text-gray-500 text-center mb-8">Ingrese su cedula para ver su historial</p>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center mb-6">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: 001-0000000-0"
                label="Cedula"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button variant="primary" onClick={handleLogin} isLoading={loading} className="w-full">
                Consultar
              </Button>
            </div>

            <p className="text-center text-sm text-gray-400 mt-8">
              <Link href="/" className="text-coopnama-primary hover:underline">Volver al inicio</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Member Info */}
            <Card className="shadow-neu">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-coopnama-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-coopnama-primary">
                      {member.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{member.full_name}</h2>
                    <p className="text-gray-500">Cedula: {member.cedula}</p>
                    {member.member_number && (
                      <p className="text-sm text-coopnama-primary">Socio #{member.member_number}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="shadow-neu-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{tickets.length}</p>
                  <p className="text-xs text-gray-500">Total Visitas</p>
                </CardContent>
              </Card>
              <Card className="shadow-neu-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {tickets.filter(t => t.status === 'completed').length}
                  </p>
                  <p className="text-xs text-gray-500">Completadas</p>
                </CardContent>
              </Card>
              <Card className="shadow-neu-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-500">
                    {tickets.filter(t => t.rating).length > 0
                      ? (tickets.reduce((sum, t) => sum + (t.rating || 0), 0) / tickets.filter(t => t.rating).length).toFixed(1)
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Rating Prom.</p>
                </CardContent>
              </Card>
            </div>

            {/* Ticket History */}
            <Card className="shadow-neu">
              <CardHeader>
                <CardTitle>Historial de Visitas</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No hay historial de visitas</p>
                ) : (
                  <div className="space-y-2">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-neu-sm">
                        <span className="font-mono font-bold text-coopnama-primary">{ticket.ticket_number}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{ticket.service?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(ticket.created_at).toLocaleDateString('es-DO', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </p>
                        </div>
                        <StatusBadge status={ticket.status} />
                        {ticket.rating && (
                          <span className="text-yellow-500 text-sm">{'★'.repeat(ticket.rating)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
