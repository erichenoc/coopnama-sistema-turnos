'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { useOrg } from '@/shared/providers/org-provider'
import {
  getForecast,
  getStaffingRecommendations,
  type DailyForecast,
  type StaffingRecommendation,
} from '@/features/forecasting/services/demand-forecaster'

export default function ForecastingPage() {
  const { organizationId, branchId } = useOrg()
  const [forecast, setForecast] = useState<DailyForecast | null>(null)
  const [staffing, setStaffing] = useState<StaffingRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [targetDate, setTargetDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })

  useEffect(() => {
    async function fetchData() {
      if (branchId === 'all') {
        setLoading(false)
        return
      }
      setLoading(true)
      const [forecastData, staffingData] = await Promise.all([
        getForecast(organizationId, branchId, targetDate),
        getStaffingRecommendations(organizationId, branchId, targetDate),
      ])
      setForecast(forecastData)
      setStaffing(staffingData)
      setLoading(false)
    }
    fetchData()
  }, [organizationId, branchId, targetDate])

  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`

  const maxPredicted = forecast
    ? Math.max(...forecast.hourly.map(h => h.predicted), 1)
    : 1

  if (branchId === 'all') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Forecasting de Demanda</h1>
        <p className="text-gray-400 mb-8">Selecciona una sucursal específica para ver el pronóstico</p>
      </div>
    )
  }

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
          <h1 className="text-2xl font-bold text-white">Forecasting de Demanda</h1>
          <p className="text-gray-400">Predicción de volumen de turnos y personal necesario</p>
        </div>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
        />
      </div>

      {/* Summary Cards */}
      {forecast && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-coopnama-primary">{forecast.totalPredicted}</p>
              <p className="text-xs text-gray-400">Turnos Predichos</p>
            </CardContent>
          </Card>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">
                {forecast.totalActual !== null ? forecast.totalActual : '—'}
              </p>
              <p className="text-xs text-gray-400">Turnos Reales</p>
            </CardContent>
          </Card>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-coopnama-secondary">
                {staffing.length > 0
                  ? Math.max(...staffing.map(s => s.recommendedAgents))
                  : 0}
              </p>
              <p className="text-xs text-gray-400">Agentes Pico</p>
            </CardContent>
          </Card>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-500">
                {forecast.hourly.filter(h => h.predicted > 0).length}
              </p>
              <p className="text-xs text-gray-400">Horas Activas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Forecast Chart */}
        <Card className="border border-white/[0.08]">
          <CardHeader>
            <CardTitle>Pronóstico por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            {forecast && (
              <div className="space-y-1">
                {forecast.hourly
                  .filter(h => h.hour >= 6 && h.hour <= 20)
                  .map(h => (
                    <div key={h.hour} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12 font-mono">{formatHour(h.hour)}</span>
                      <div className="flex-1 h-6 bg-white/[0.06] rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-coopnama-primary/70 rounded-full transition-all"
                          style={{ width: `${(h.predicted / maxPredicted) * 100}%` }}
                        />
                        {h.actual !== null && (
                          <div
                            className="absolute top-0 h-full bg-green-500/40 rounded-full"
                            style={{ width: `${(h.actual / maxPredicted) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-200 w-8 text-right">{h.predicted}</span>
                    </div>
                  ))}
                <div className="flex gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-coopnama-primary/70 rounded" /> Predicho
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500/40 rounded" /> Real
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staffing Recommendations */}
        <Card className="border border-white/[0.08]">
          <CardHeader>
            <CardTitle>Recomendación de Personal</CardTitle>
          </CardHeader>
          <CardContent>
            {staffing.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Sin datos suficientes para recomendaciones</p>
            ) : (
              <div className="space-y-2">
                {staffing.map(s => (
                  <div key={s.hour} className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                    <span className="text-sm font-mono text-gray-400 w-12">{formatHour(s.hour)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {s.predictedTickets} turnos
                      </p>
                      <p className="text-xs text-gray-400">{s.reason}</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${
                        s.recommendedAgents >= 4 ? 'text-red-400' :
                        s.recommendedAgents >= 2 ? 'text-amber-400' : 'text-green-400'
                      }`}>{s.recommendedAgents}</p>
                      <p className="text-xs text-gray-400">agentes</p>
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
