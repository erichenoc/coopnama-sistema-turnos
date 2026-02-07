'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/shared/components/button'
import { Input } from '@/shared/components/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card'
import { Select, type SelectOption } from '@/shared/components/select'
import { Badge } from '@/shared/components/badge'
import { Spinner } from '@/shared/components/spinner'
import { useOrg } from '@/shared/providers/org-provider'
import { getAuditLogs, getAuditActions, type AuditEntry } from '@/features/compliance/services/audit-log-service'

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-gray-100 text-gray-800',
}

export default function AuditPage() {
  const { organizationId } = useOrg()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<SelectOption[]>([])

  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    dateFrom: '',
    dateTo: '',
  })

  const [page, setPage] = useState(0)
  const pageSize = 20

  useEffect(() => {
    loadActions()
    loadLogs()
  }, [organizationId])

  async function loadActions() {
    const data = await getAuditActions(organizationId)
    setActions([
      { value: '', label: 'Todas las acciones' },
      ...data.map(a => ({ value: a, label: a })),
    ])
  }

  async function loadLogs() {
    setLoading(true)
    const { data, total } = await getAuditLogs(organizationId, {
      action: filters.action || undefined,
      entity_type: filters.entity_type || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      limit: pageSize,
      offset: page * pageSize,
    })
    setLogs(data)
    setTotal(total)
    setLoading(false)
  }

  function handleApplyFilters() {
    setPage(0)
    loadLogs()
  }

  function handleNextPage() {
    if ((page + 1) * pageSize < total) {
      setPage(p => p + 1)
      loadLogs()
    }
  }

  function handlePrevPage() {
    if (page > 0) {
      setPage(p => p - 1)
      loadLogs()
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neu-text mb-2">Auditoria</h1>
        <p className="text-neu-text-secondary">
          Registro de todas las acciones realizadas en el sistema
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Accion"
              options={actions}
              value={filters.action}
              onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
            />
            <Input
              label="Tipo de Entidad"
              value={filters.entity_type}
              onChange={e => setFilters(f => ({ ...f, entity_type: e.target.value }))}
              placeholder="ej: ticket"
            />
            <Input
              label="Desde"
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            />
            <Input
              label="Hasta"
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="mt-4">
            <Button variant="primary" onClick={handleApplyFilters}>
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neu-border">
                      <th className="text-left py-3 px-4 font-semibold text-neu-text">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold text-neu-text">Usuario</th>
                      <th className="text-left py-3 px-4 font-semibold text-neu-text">Accion</th>
                      <th className="text-left py-3 px-4 font-semibold text-neu-text">Entidad</th>
                      <th className="text-left py-3 px-4 font-semibold text-neu-text">ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-neu-text">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b border-neu-border hover:bg-neu-bg-hover">
                        <td className="py-3 px-4 text-sm text-neu-text-secondary">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {log.user ? (
                            <div>
                              <div className="font-medium text-neu-text">{log.user.full_name}</div>
                              <div className="text-xs text-neu-text-secondary">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-neu-text-secondary italic">Sistema</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-neu-text">{log.entity_type}</td>
                        <td className="py-3 px-4 text-sm text-neu-text-secondary">
                          {log.entity_id || '-'}
                        </td>
                        <td className="py-3 px-4 text-xs text-neu-text-secondary max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-neu-text-secondary">
                  Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} de {total}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handlePrevPage} disabled={page === 0}>
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleNextPage}
                    disabled={(page + 1) * pageSize >= total}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
