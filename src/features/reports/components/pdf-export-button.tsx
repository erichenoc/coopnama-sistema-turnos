'use client'

import { useState } from 'react'
import { Button } from '@/shared/components'
import { ReportBuilder } from '@/lib/pdf/report-builder'

interface AgentData {
  agent_name: string
  tickets_served: number
  avg_service_minutes: number | null
  avg_rating: number | null
}

interface PdfExportButtonProps {
  orgName: string
  dateRange: string
  totalTickets: number
  completedTickets: number
  avgWaitMinutes: number
  avgServiceMinutes: number
  completionRate: number
  agentData: AgentData[]
}

export function PdfExportButton({
  orgName,
  dateRange,
  totalTickets,
  completedTickets,
  avgWaitMinutes,
  avgServiceMinutes,
  completionRate,
  agentData,
}: PdfExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)

    try {
      const dateLabel = dateRange === 'today' ? 'Hoy' : dateRange === '7days' ? 'Ultimos 7 dias' : 'Ultimos 30 dias'
      const report = new ReportBuilder()

      report
        .addHeader(`${orgName} - Reporte de Turnos`, `Periodo: ${dateLabel} | Generado: ${new Date().toLocaleString('es-DO')}`)
        .addSection('Resumen General')
        .addMetric('Total de Turnos', totalTickets)
        .addMetric('Turnos Completados', completedTickets)
        .addMetric('Tiempo Promedio de Espera', avgWaitMinutes.toFixed(1), 'min')
        .addMetric('Tiempo Promedio de Atencion', avgServiceMinutes.toFixed(1), 'min')
        .addMetric('Tasa de Completacion', `${completionRate.toFixed(0)}%`)
        .addSpace(4)

      if (agentData.length > 0) {
        report
          .addSection('Rendimiento de Agentes')
          .addTable(
            ['Agente', 'Tickets', 'T. Atencion (min)', 'Rating'],
            agentData.map(a => [
              a.agent_name,
              a.tickets_served,
              a.avg_service_minutes != null ? a.avg_service_minutes : '-',
              a.avg_rating != null ? a.avg_rating : '-',
            ])
          )
      }

      const filename = `reporte-${orgName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      report.download(filename)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={handleExport}
      disabled={exporting}
    >
      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      {exporting ? 'Exportando...' : 'PDF'}
    </Button>
  )
}
