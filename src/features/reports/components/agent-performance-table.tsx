'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components'

interface AgentPerformance {
  user_id: string
  agent_name: string
  tickets_served: number
  avg_service_minutes: number | null
  avg_wait_minutes: number | null
  avg_rating: number | null
  rated_count: number
  satisfied_count: number
}

interface AgentPerformanceTableProps {
  data: AgentPerformance[]
}

export function AgentPerformanceTable({ data }: AgentPerformanceTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento de Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 text-center py-8">No hay datos de agentes disponibles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento de Agentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left py-3 px-2 text-gray-300 font-medium">Agente</th>
                <th className="text-right py-3 px-2 text-gray-300 font-medium">Tickets</th>
                <th className="text-right py-3 px-2 text-gray-300 font-medium">T. Atencion</th>
                <th className="text-right py-3 px-2 text-gray-300 font-medium">T. Espera</th>
                <th className="text-right py-3 px-2 text-gray-300 font-medium">Rating</th>
                <th className="text-right py-3 px-2 text-gray-300 font-medium">CSAT</th>
              </tr>
            </thead>
            <tbody>
              {data.map((agent) => {
                const csatPct = agent.rated_count > 0
                  ? ((agent.satisfied_count / agent.rated_count) * 100).toFixed(0)
                  : '-'

                return (
                  <tr key={agent.user_id} className="border-b border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <td className="py-3 px-2 font-medium text-white">{agent.agent_name}</td>
                    <td className="py-3 px-2 text-right text-gray-200">{agent.tickets_served}</td>
                    <td className="py-3 px-2 text-right text-gray-200">
                      {agent.avg_service_minutes != null ? `${agent.avg_service_minutes} min` : '-'}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-200">
                      {agent.avg_wait_minutes != null ? `${agent.avg_wait_minutes} min` : '-'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {agent.avg_rating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <span className="text-gray-200">{agent.avg_rating}</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {csatPct !== '-' ? (
                        <span className={`font-semibold ${
                          Number(csatPct) >= 80 ? 'text-green-600' :
                          Number(csatPct) >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {csatPct}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
