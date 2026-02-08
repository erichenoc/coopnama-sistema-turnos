'use client'

import type { CopilotTab } from '../types'

interface NewAgentModeWrapperProps {
  children: React.ReactNode
  activeTab: CopilotTab
}

const TAB_HELP: Record<CopilotTab, { title: string; description: string }> = {
  chat: {
    title: 'Chat con el Copiloto',
    description:
      'Aqui puedes conversar con la IA para obtener sugerencias sobre como atender al cliente. La IA tiene acceso al historial del miembro y los servicios disponibles.',
  },
  member: {
    title: 'Perfil del Miembro',
    description:
      'Muestra informacion completa del miembro: datos personales, historial de visitas, calificaciones y tendencia de satisfaccion. Usa esto para personalizar la atencion.',
  },
  kb: {
    title: 'Base de Conocimiento',
    description:
      'Consulta procedimientos y guias para el servicio actual. Se buscan automaticamente las guias relacionadas al servicio. Tambien puedes buscar manualmente cualquier tema.',
  },
  actions: {
    title: 'Acciones',
    description:
      'Aqui puedes generar un resumen del servicio, ver recomendaciones de transferencia, y crear acciones de seguimiento para el cliente.',
  },
}

export function NewAgentModeWrapper({
  children,
  activeTab,
}: NewAgentModeWrapperProps) {
  const help = TAB_HELP[activeTab]

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-neu-sm p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-blue-500 text-sm">💡</span>
          <h5 className="text-xs font-semibold text-blue-800">{help.title}</h5>
        </div>
        <p className="text-xs text-blue-600">{help.description}</p>
      </div>
      {children}
    </div>
  )
}
