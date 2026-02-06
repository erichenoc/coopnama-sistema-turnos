'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/shared/types/domain'
import { PRIORITY_LABELS } from '@/shared/types/domain'
import type { PriorityName } from '@/shared/types/domain'

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const limit = 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .eq('organization_id', DEMO_ORG_ID)
      .eq('is_active', true)

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,cedula.ilike.%${search}%,phone.ilike.%${search}%,member_number.ilike.%${search}%`
      )
    }

    const { data, count } = await query.order('full_name').range(offset, offset + limit - 1)
    setMembers((data || []) as Member[])
    setTotal(count || 0)
    setLoading(false)
  }, [search, page])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const form = new FormData(e.currentTarget)

    const memberData = {
      organization_id: DEMO_ORG_ID,
      full_name: `${form.get('firstName')} ${form.get('lastName')}`,
      first_name: form.get('firstName') as string,
      last_name: form.get('lastName') as string,
      cedula: form.get('cedula') as string || null,
      phone: form.get('phone') as string || null,
      email: form.get('email') as string || null,
      member_number: form.get('memberNumber') as string || null,
      priority_level: Number(form.get('priority')) || 0,
      notes: form.get('notes') as string || null,
    }

    if (editingMember) {
      await supabase.from('members').update(memberData).eq('id', editingMember.id)
    } else {
      await supabase.from('members').insert(memberData)
    }

    setSaving(false)
    setShowModal(false)
    setEditingMember(null)
    fetchMembers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Desactivar este miembro?')) return
    const supabase = createClient()
    await supabase.from('members').update({ is_active: false }).eq('id', id)
    fetchMembers()
  }

  const priorityName = (level: number): PriorityName => {
    const map: Record<number, PriorityName> = { 0: 'normal', 1: 'preferential', 2: 'vip', 3: 'urgent' }
    return map[level] || 'normal'
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Miembros</h1>
          <p className="text-gray-500">{total} miembros registrados</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingMember(null); setShowModal(true) }}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Miembro
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Buscar por nombre, cedula, telefono o numero de socio..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </div>

      {/* Members Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">&#128100;</span>
              <p className="text-gray-500 text-lg">No se encontraron miembros</p>
              <p className="text-gray-400 text-sm mt-1">
                {search ? 'Intenta con otra busqueda' : 'Agrega tu primer miembro'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Nombre</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Cedula</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Telefono</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">No. Socio</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Prioridad</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Visitas</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-800">{member.full_name}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono">{member.cedula || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">{member.phone || '-'}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono">{member.member_number || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          member.priority_level === 0 ? 'bg-gray-100 text-gray-600' :
                          member.priority_level === 1 ? 'bg-blue-100 text-blue-700' :
                          member.priority_level === 2 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {PRIORITY_LABELS[priorityName(member.priority_level)]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{member.total_visits}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => { setEditingMember(member); setShowModal(true) }}
                          className="p-1.5 text-gray-400 hover:text-coopnama-primary rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-1.5 text-gray-400 hover:text-coopnama-danger rounded transition-colors ml-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Pagina {page} de {Math.ceil(total / 20)}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingMember(null) }} size="lg">
        <form onSubmit={handleSave}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-gray-800">
              {editingMember ? 'Editar Miembro' : 'Nuevo Miembro'}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre" name="firstName" defaultValue={editingMember?.first_name || ''} required />
                <Input label="Apellido" name="lastName" defaultValue={editingMember?.last_name || ''} required />
              </div>
              <Input label="Cedula" name="cedula" defaultValue={editingMember?.cedula || ''} placeholder="001-0000000-0" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Telefono" name="phone" type="tel" defaultValue={editingMember?.phone || ''} />
                <Input label="Email" name="email" type="email" defaultValue={editingMember?.email || ''} />
              </div>
              <Input label="Numero de Socio" name="memberNumber" defaultValue={editingMember?.member_number || ''} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <select name="priority" defaultValue={editingMember?.priority_level || 0} className="w-full px-4 py-3 bg-neu-bg shadow-neu-inset-xs rounded-neu-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30">
                  <option value={0}>Normal</option>
                  <option value={1}>Preferencial</option>
                  <option value={2}>VIP</option>
                  <option value={3}>Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea name="notes" rows={3} defaultValue={editingMember?.notes || ''} className="w-full px-4 py-3 bg-neu-bg shadow-neu-inset-xs rounded-neu-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30" />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              {editingMember ? 'Guardar Cambios' : 'Crear Miembro'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}
