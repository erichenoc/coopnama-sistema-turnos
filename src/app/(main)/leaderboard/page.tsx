'use client'

import { useOrg } from '@/shared/providers/org-provider'
import { AgentLeaderboard } from '@/features/gamification/components/agent-leaderboard'

export default function LeaderboardPage() {
  const { organizationId, branchId } = useOrg()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tabla de Posiciones</h1>
        <p className="text-gray-400">Rendimiento de agentes en tiempo real</p>
      </div>
      <AgentLeaderboard
        organizationId={organizationId}
        branchId={branchId === 'all' ? undefined : branchId}
      />
    </div>
  )
}
