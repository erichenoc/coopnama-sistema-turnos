'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { useOrg } from '@/shared/providers/org-provider'
import {
  getSentimentOverview,
  getSentimentByAgent,
  getSentimentByService,
  type SentimentStats,
  type SentimentByAgent,
  type SentimentByService,
} from '@/features/sentiment/services/sentiment-service'

export default function SentimentPage() {
  const { organizationId, branchId } = useOrg()
  const [overview, setOverview] = useState<SentimentStats | null>(null)
  const [byAgent, setByAgent] = useState<SentimentByAgent[]>([])
  const [byService, setByService] = useState<SentimentByService[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [overviewData, agentData, serviceData] = await Promise.all([
        getSentimentOverview(organizationId, branchId, days),
        getSentimentByAgent(organizationId, branchId, days),
        getSentimentByService(organizationId, branchId, days),
      ])
      setOverview(overviewData)
      setByAgent(agentData)
      setByService(serviceData)
      setLoading(false)
    }
    fetchData()
  }, [organizationId, branchId, days])

  const sentimentPercent = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analisis de Sentimiento</h1>
          <p className="text-gray-400">Tendencias de satisfaccion del cliente</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
        >
          <option value={7}>Ultimos 7 dias</option>
          <option value={30}>Ultimos 30 dias</option>
          <option value={90}>Ultimos 90 dias</option>
        </select>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{overview.total}</p>
              <p className="text-xs text-gray-400">Total Feedback</p>
            </CardContent>
          </Card>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-500">{'★'.repeat(Math.round(overview.avgRating))}</p>
              <p className="text-xs text-gray-400">{overview.avgRating}/5 Promedio</p>
            </CardContent>
          </Card>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{sentimentPercent(overview.positive, overview.total)}%</p>
              <p className="text-xs text-gray-400">Positivo ({overview.positive})</p>
            </CardContent>
          </Card>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-400">{sentimentPercent(overview.neutral, overview.total)}%</p>
              <p className="text-xs text-gray-400">Neutral ({overview.neutral})</p>
            </CardContent>
          </Card>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{sentimentPercent(overview.negative, overview.total)}%</p>
              <p className="text-xs text-gray-400">Negativo ({overview.negative})</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sentiment Bar */}
      {overview && overview.total > 0 && (
        <Card className="border border-white/[0.08] mb-8">
          <CardContent className="p-4">
            <div className="flex h-6 rounded-full overflow-hidden">
              <div className="bg-green-500 transition-all" style={{ width: `${sentimentPercent(overview.positive, overview.total)}%` }} />
              <div className="bg-gray-400 transition-all" style={{ width: `${sentimentPercent(overview.neutral, overview.total)}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${sentimentPercent(overview.negative, overview.total)}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Positivo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full" /> Neutral</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" /> Negativo</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Agent */}
        <Card className="border border-white/[0.08]">
          <CardHeader>
            <CardTitle>Por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            {byAgent.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Sin datos de agentes</p>
            ) : (
              <div className="space-y-3">
                {byAgent.map((agent) => (
                  <div key={agent.agentId} className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                    <div className="w-8 h-8 bg-coopnama-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-coopnama-primary">
                      {agent.agentName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{agent.agentName}</p>
                      <p className="text-xs text-gray-400">{agent.total} evaluaciones</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-500">{'★'.repeat(Math.round(agent.avgRating))}</p>
                      <div className="flex gap-1 text-xs">
                        <span className="text-green-600">{agent.positive}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-400">{agent.neutral}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-red-600">{agent.negative}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Service */}
        <Card className="border border-white/[0.08]">
          <CardHeader>
            <CardTitle>Por Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            {byService.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Sin datos de servicios</p>
            ) : (
              <div className="space-y-3">
                {byService.map((service) => (
                  <div key={service.serviceId} className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{service.serviceName}</p>
                      <p className="text-xs text-gray-400">{service.total} evaluaciones</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-500">{'★'.repeat(Math.round(service.avgRating))}</p>
                      <div className="flex gap-1 text-xs">
                        <span className="text-green-600">{service.positive}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-400">{service.neutral}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-red-600">{service.negative}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
