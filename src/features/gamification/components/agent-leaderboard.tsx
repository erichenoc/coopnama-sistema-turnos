'use client'

/**
 * Agent Leaderboard Component
 * Displays ranked agents with gamification elements
 */

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import {
  getLeaderboard,
  getAchievements,
  type LeaderboardAgent,
  type Achievement,
} from '../services/metrics-service'

// ============================================
// TYPES
// ============================================

interface AgentLeaderboardProps {
  organizationId: string
  branchId?: string
}

interface AgentWithAchievements extends LeaderboardAgent {
  achievements: Achievement[]
}

// ============================================
// COMPONENT
// ============================================

export function AgentLeaderboard({ organizationId, branchId }: AgentLeaderboardProps) {
  const [agents, setAgents] = useState<AgentWithAchievements[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      try {
        const leaderboardData = await getLeaderboard(organizationId, branchId)

        // Fetch achievements for each agent
        const agentsWithAchievements = await Promise.all(
          leaderboardData.map(async (agent) => {
            const achievements = await getAchievements(agent.agent_id)
            return { ...agent, achievements }
          })
        )

        setAgents(agentsWithAchievements)
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [organizationId, branchId])

  // Format time in MM:SS
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get medal emoji for top 3
  const getMedal = (rank: number): string => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return ''
  }

  // Render star rating
  const renderStars = (rating: number | null) => {
    if (rating === null) return <span className="text-gray-400">Sin calificaciones</span>

    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return (
              <span key={i} className="text-yellow-400">
                ★
              </span>
            )
          } else if (i === fullStars && hasHalfStar) {
            return (
              <span key={i} className="text-yellow-400">
                ★
              </span>
            )
          } else {
            return (
              <span key={i} className="text-gray-300">
                ★
              </span>
            )
          }
        })}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <Card className="bg-neu-bg shadow-neu">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tabla de Posiciones</span>
          <span className="text-sm font-normal text-gray-500">
            {lastUpdate.toLocaleDateString('es-DO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" label="Cargando leaderboard..." />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No hay datos de agentes para hoy</p>
            <p className="text-sm mt-2">Los agentes aparecerán cuando completen turnos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Posición
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Agente
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Turnos
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Tiempo Prom.
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Calificación
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {/* Rank */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getMedal(agent.rank)}</span>
                        <span className="text-lg font-bold text-gray-700">#{agent.rank}</span>
                      </div>
                    </td>

                    {/* Agent Name + Achievements */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agent.agent_name}
                            className="w-10 h-10 rounded-full object-cover shadow-neu-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-coopnama-primary to-coopnama-secondary flex items-center justify-center text-white font-bold shadow-neu-sm">
                            {agent.agent_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-800">{agent.agent_name}</p>
                          {agent.achievements.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {agent.achievements.slice(0, 3).map((achievement) => (
                                <Badge
                                  key={achievement.id}
                                  variant="outline"
                                  className="text-xs shadow-neu-sm"
                                  title={achievement.description || achievement.achievement_name}
                                >
                                  {getAchievementEmoji(achievement.achievement_type)}
                                </Badge>
                              ))}
                              {agent.achievements.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{agent.achievements.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tickets Served */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neu-bg shadow-neu-inset text-lg font-bold text-coopnama-primary">
                        {agent.tickets_served}
                      </span>
                    </td>

                    {/* Avg Service Time */}
                    <td className="px-4 py-4 text-center">
                      <span className="font-mono text-sm text-gray-700">
                        {formatTime(agent.avg_service_time)}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-4 text-center">{renderStars(agent.avg_rating)}</td>

                    {/* Total Score */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-coopnama-primary to-coopnama-secondary">
                        {Math.round(agent.total_score)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAchievementEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    first_ticket: '🎯',
    speed_demon: '⚡',
    five_star: '⭐',
    century: '💯',
    marathon: '🏃',
  }
  return emojiMap[type] || '🏆'
}
