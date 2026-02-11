'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components'

interface HeatmapCell {
  day_of_week: number
  hour_of_day: number
  ticket_count: number
  avg_wait_minutes: number | null
}

interface ServiceHeatmapProps {
  data: HeatmapCell[]
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8am - 6pm

function getIntensity(count: number, max: number): string {
  if (count === 0 || max === 0) return 'bg-white/[0.04]'
  const ratio = count / max
  if (ratio >= 0.75) return 'bg-[#009e59] text-white'
  if (ratio >= 0.5) return 'bg-emerald-400 text-white'
  if (ratio >= 0.25) return 'bg-emerald-200 text-emerald-800'
  return 'bg-emerald-100 text-emerald-700'
}

export function ServiceHeatmap({ data }: ServiceHeatmapProps) {
  const maxCount = Math.max(...data.map(d => d.ticket_count), 1)

  const getCell = (day: number, hour: number): HeatmapCell | undefined => {
    return data.find(d => d.day_of_week === day && d.hour_of_day === hour)
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Calor - Demanda por Hora</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">No hay datos disponibles (ultimos 30 dias)</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Calor - Demanda por Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-2 px-1 text-gray-400 font-medium text-left w-12"></th>
                {HOURS.map(h => (
                  <th key={h} className="py-2 px-1 text-gray-400 font-medium text-center">
                    {h}:00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <tr key={day}>
                  <td className="py-1 px-1 font-medium text-gray-300">{DAY_LABELS[day]}</td>
                  {HOURS.map(hour => {
                    const cell = getCell(day, hour)
                    const count = cell?.ticket_count || 0
                    return (
                      <td key={hour} className="py-1 px-1">
                        <div
                          className={`w-full h-8 rounded flex items-center justify-center font-semibold ${getIntensity(count, maxCount)}`}
                          title={`${DAY_LABELS[day]} ${hour}:00 - ${count} tickets${cell?.avg_wait_minutes ? `, espera ~${cell.avg_wait_minutes}min` : ''}`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 justify-center">
          <span className="text-xs text-gray-300">Menor</span>
          <div className="flex gap-1">
            <div className="w-6 h-4 rounded bg-white/[0.04] border border-white/[0.08]"></div>
            <div className="w-6 h-4 rounded bg-emerald-100"></div>
            <div className="w-6 h-4 rounded bg-emerald-200"></div>
            <div className="w-6 h-4 rounded bg-emerald-400"></div>
            <div className="w-6 h-4 rounded bg-[#009e59]"></div>
          </div>
          <span className="text-xs text-gray-300">Mayor</span>
        </div>
      </CardContent>
    </Card>
  )
}
