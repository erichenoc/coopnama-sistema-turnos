'use client'

import { useAgentMetrics } from '../hooks/use-agent-metrics'

interface AgentMetricsSidebarProps {
  agentId: string | null
}

export function AgentMetricsSidebar({ agentId }: AgentMetricsSidebarProps) {
  const { metrics, loading } = useAgentMetrics(agentId)

  if (loading && metrics.todayServed === 0) return null

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
      <div className="flex items-center gap-1">
        <span className="font-medium text-gray-800">{metrics.todayServed}</span>
        <span>atendidos</span>
      </div>
      <div className="w-px h-3 bg-gray-300" />
      <div className="flex items-center gap-1">
        <span className="font-medium text-gray-800">
          {formatTime(metrics.avgServiceTime)}
        </span>
        <span>prom</span>
      </div>
      <div className="w-px h-3 bg-gray-300" />
      <div className="flex items-center gap-1">
        {metrics.avgRating !== null ? (
          <>
            <span className="text-yellow-500">&#9733;</span>
            <span className="font-medium text-gray-800">{metrics.avgRating}</span>
          </>
        ) : (
          <span>Sin calif.</span>
        )}
      </div>
    </div>
  )
}
