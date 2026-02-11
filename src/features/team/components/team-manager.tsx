'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card'
import { Button } from '@/shared/components/button'
import { Badge } from '@/shared/components/badge'
import { Select, type SelectOption } from '@/shared/components/select'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/shared/components/modal'
import { Spinner } from '@/shared/components/spinner'
import {
  getTeamUsersAction,
  updateUserRoleAction,
  assignUserBranchAction,
  toggleUserActiveAction,
  deleteTeamUserAction,
  getBranchesForAssignment,
  type TeamUser,
} from '@/lib/actions/users'
import { cn } from '@/shared/utils/cn'

interface TeamManagerProps {
  organizationId: string
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  owner: 'Propietario',
  admin: 'Administrador',
  branch_manager: 'Gerente de Sucursal',
  supervisor: 'Supervisor',
  agent: 'Agente',
  receptionist: 'Recepcionista',
  kiosk: 'Kiosk',
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  owner: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  admin: 'bg-red-500/10 text-red-400 border-red-500/30',
  branch_manager: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  supervisor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  agent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  receptionist: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  kiosk: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

export function TeamManager({ organizationId }: TeamManagerProps) {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [branches, setBranches] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId?: string }>({ isOpen: false })
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [organizationId])

  async function loadData() {
    setLoading(true)
    try {
      const [usersResult, branchesResult] = await Promise.all([
        getTeamUsersAction(organizationId),
        getBranchesForAssignment(organizationId),
      ])

      if (!usersResult.error && usersResult.data) {
        setUsers(usersResult.data)
      } else {
        toast.error(usersResult.error || 'Error al cargar usuarios')
      }

      if (!branchesResult.error && branchesResult.data) {
        // Map {id, name}[] to SelectOption[] format
        setBranches(branchesResult.data.map((b) => ({ value: b.id, label: b.name })))
      }
    } catch (error) {
      toast.error('Error al cargar datos del equipo')
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setProcessingUserId(userId)
    try {
      const result = await updateUserRoleAction(organizationId, userId, newRole as any)
      if (!result.error) {
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
        )
        toast.success('Rol actualizado correctamente')
      } else {
        toast.error(result.error || 'Error al actualizar rol')
      }
    } catch (error) {
      toast.error('Error al actualizar rol')
    } finally {
      setProcessingUserId(null)
    }
  }

  async function handleBranchChange(userId: string, branchId: string) {
    setProcessingUserId(userId)
    try {
      const result = await assignUserBranchAction(organizationId, userId, branchId || null)
      if (!result.error) {
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, branch_id: branchId || null } : user))
        )
        toast.success('Sucursal asignada correctamente')
      } else {
        toast.error(result.error || 'Error al asignar sucursal')
      }
    } catch (error) {
      toast.error('Error al asignar sucursal')
    } finally {
      setProcessingUserId(null)
    }
  }

  async function handleToggleActive(userId: string, currentStatus: boolean) {
    setProcessingUserId(userId)
    try {
      const result = await toggleUserActiveAction(organizationId, userId, !currentStatus)
      if (!result.error) {
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, is_active: !currentStatus } : user))
        )
        toast.success(`Usuario ${!currentStatus ? 'activado' : 'desactivado'} correctamente`)
      } else {
        toast.error(result.error || 'Error al cambiar estado')
      }
    } catch (error) {
      toast.error('Error al cambiar estado del usuario')
    } finally {
      setProcessingUserId(null)
    }
  }

  async function handleDeleteUser() {
    if (!deleteModal.userId) return
    setProcessingUserId(deleteModal.userId)
    try {
      const result = await deleteTeamUserAction(organizationId, deleteModal.userId)
      if (!result.error) {
        setUsers((prev) => prev.filter((user) => user.id !== deleteModal.userId))
        toast.success('Usuario eliminado correctamente')
      } else {
        toast.error(result.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      toast.error('Error al eliminar usuario')
    } finally {
      setProcessingUserId(null)
      setDeleteModal({ isOpen: false })
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active)
    return matchesSearch && matchesRole && matchesStatus
  })

  const roleOptions: SelectOption[] = Object.entries(ROLE_LABELS)
    .filter(([key]) => !['superadmin', 'kiosk'].includes(key))
    .map(([value, label]) => ({ value, label }))

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Equipo</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.10] rounded-neu-sm px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#009e59]/50 focus:ring-2 focus:ring-[#009e59]/20 transition-all"
                />
              </div>
              <Select
                placeholder="Filtrar por rol"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[{ value: 'all', label: 'Todos los roles' }, ...roleOptions]}
              />
              <Select
                placeholder="Filtrar por estado"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  { value: 'active', label: 'Activos' },
                  { value: 'inactive', label: 'Inactivos' },
                ]}
              />
            </div>

            {/* User list - Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08] text-left">
                    <th className="pb-3 text-sm font-medium text-gray-400">Usuario</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Rol</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Sucursal</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Estado</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={cn(!user.is_active && 'opacity-50')}>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#009e59] to-[#00c96f] flex items-center justify-center text-white font-semibold">
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.full_name || 'Sin nombre'}</p>
                            {user.employee_id && (
                              <p className="text-sm text-gray-400">ID: {user.employee_id}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <Select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          options={roleOptions}
                          disabled={processingUserId === user.id}
                          className="max-w-[200px]"
                        />
                      </td>
                      <td className="py-4">
                        <Select
                          value={user.branch_id || ''}
                          onChange={(e) => handleBranchChange(user.id, e.target.value)}
                          options={[{ value: '', label: 'Sin asignar' }, ...branches]}
                          disabled={processingUserId === user.id}
                          className="max-w-[200px]"
                        />
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          disabled={processingUserId === user.id}
                          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                        >
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              user.is_active ? 'bg-emerald-400' : 'bg-gray-500'
                            )}
                          />
                          <span className={user.is_active ? 'text-emerald-400' : 'text-gray-500'}>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </button>
                      </td>
                      <td className="py-4">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteModal({ isOpen: true, userId: user.id })}
                          disabled={processingUserId === user.id}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* User list - Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} variant="inset" size="sm" className={cn(!user.is_active && 'opacity-50')}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#009e59] to-[#00c96f] flex items-center justify-center text-white font-semibold shrink-0">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{user.full_name || 'Sin nombre'}</p>
                        {user.employee_id && (
                          <p className="text-sm text-gray-400 truncate">ID: {user.employee_id}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Select
                        label="Rol"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        options={roleOptions}
                        disabled={processingUserId === user.id}
                      />
                      <Select
                        label="Sucursal"
                        value={user.branch_id || ''}
                        onChange={(e) => handleBranchChange(user.id, e.target.value)}
                        options={[{ value: '', label: 'Sin asignar' }, ...branches]}
                        disabled={processingUserId === user.id}
                      />
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          disabled={processingUserId === user.id}
                          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                        >
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              user.is_active ? 'bg-emerald-400' : 'bg-gray-500'
                            )}
                          />
                          <span className={user.is_active ? 'text-emerald-400' : 'text-gray-500'}>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteModal({ isOpen: true, userId: user.id })}
                          disabled={processingUserId === user.id}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Empty state */}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No se encontraron usuarios</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false })}
        size="sm"
        showCloseButton={false}
      >
        <ModalHeader>
          <h2 className="text-xl font-semibold text-white">Eliminar Usuario</h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-gray-300">
            Esta acción es permanente. El usuario perderá acceso al sistema inmediatamente.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ isOpen: false })}
            disabled={processingUserId === deleteModal.userId}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
            isLoading={processingUserId === deleteModal.userId}
          >
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
