'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components'
import { useOrg } from '@/shared/providers/org-provider'

interface Anomaly {
  id: string
  anomaly_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metric_value: number
  threshold_value: number
  is_resolved: boolean
  created_at: string
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-300', icon: '🔴' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-300', icon: '🟠' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-300', icon: '🟡' },
  low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300', icon: '🔵' },
}

const TYPE_LABELS: Record<string, string> = {
  high_wait_time: 'Espera Alta',
  high_no_show: 'No Presentados',
  low_csat: 'CSAT Bajo',
  traffic_spike: 'Pico de Trafico',
  agent_performance_drop: 'Rendimiento',
}

export function AnomalyAlerts() {
  const { organizationId } = useOrg()
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetch() {
      const { data } = await supabase
        .from('ai_anomalies')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(5)

      setAnomalies(data || [])
      setLoading(false)
    }

    fetch()

    // Listen for new anomalies in real-time
    const channel = supabase
      .channel('anomaly-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_anomalies', filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          setAnomalies(prev => [payload.new as Anomaly, ...prev].slice(0, 5))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizationId])

  const handleDismiss = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('ai_anomalies')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)

    setAnomalies(prev => prev.filter(a => a.id !== id))
  }

  if (loading || anomalies.length === 0) return null

  return (
    <Card className="border-l-4 border-l-orange-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Alertas AI</span>
            <span className="px-2 py-0.5 bg-orange-500/10 text-orange-300 text-xs font-medium rounded-full">
              {anomalies.length}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {anomalies.map((anomaly) => {
            const style = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.low
            return (
              <div
                key={anomaly.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
              >
                <span className="text-lg mt-0.5">{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${style.text}`}>{anomaly.title}</span>
                    <span className="px-1.5 py-0.5 bg-white/[0.06] text-xs rounded">
                      {TYPE_LABELS[anomaly.anomaly_type] || anomaly.anomaly_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">{anomaly.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(anomaly.created_at).toLocaleString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(anomaly.id)}
                  className="text-gray-400 hover:text-gray-300 p-1"
                  title="Descartar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
