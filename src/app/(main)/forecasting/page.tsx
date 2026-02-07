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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Forecasting de Demanda</h1>
        <p className="text-gray-500 mb-8">Selecciona una sucursal específica para ver el pronóstico</p>
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
          <h1 className="text-2xl font-bold text-gray-800">Forecasting de Demanda</h1>
          <p className="text-gray-500">Predicción de volumen de turnos y personal necesario</p>
        </div>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="px-4 py-2 bg-neu-bg shadow-neu-xs rounded-neu-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coopnama-primary/30"
        />
      </div>

      {/* Summary Cards */}
      {forecast && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-neu-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-coopnama-primary">{forecast.totalPredicted}</p>
              <p className="text-xs text-gray-500">Turnos Predichos</p>
            </CardContent>
          </Card>
          <Card className="shadow-neu-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-800">
                {forecast.totalActual !== null ? forecast.totalActual : '—'}
              </p>
              <p className="text-xs text-gray-500">Turnos Reales</p>
            </CardContent>
          </Card>
          <Card className="shadow-neu-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-coopnama-secondary">
                {staffing.length > 0
                  ? Math.max(...staffing.map(s => s.recommendedAgents))
                  : 0}
              </p>
              <p className="text-xs text-gray-500">Agentes Pico</p>
            </CardContent>
          </Card>
          <Card className="shadow-neu-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-500">
                {forecast.hourly.filter(h => h.predicted > 0).length}
              </p>
              <p className="text-xs text-gray-500">Horas Activas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Forecast Chart */}
        <Card className="shadow-neu">
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
                      <span className="text-xs text-gray-500 w-12 font-mono">{formatHour(h.hour)}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
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
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{h.predicted}</span>
                    </div>
                  ))}
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
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
        <Card className="shadow-neu">
          <CardHeader>
            <CardTitle>Recomendación de Personal</CardTitle>
          </CardHeader>
          <CardContent>
            {staffing.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Sin datos suficientes para recomendaciones</p>
            ) : (
              <div className="space-y-2">
                {staffing.map(s => (
                  <div key={s.hour} className="flex items-center gap-3 p-3 bg-gray-50 rounded-neu-sm">
                    <span className="text-sm font-mono text-gray-500 w-12">{formatHour(s.hour)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {s.predictedTickets} turnos
                      </p>
                      <p className="text-xs text-gray-500">{s.reason}</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${
                        s.recommendedAgents >= 4 ? 'text-red-600' :
                        s.recommendedAgents >= 2 ? 'text-amber-600' : 'text-green-600'
                      }`}>{s.recommendedAgents}</p>
                      <p className="text-xs text-gray-500">agentes</p>
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
