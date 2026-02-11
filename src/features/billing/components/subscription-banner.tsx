'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/shared/components'
import { createBillingPortalSession } from '@/features/billing/actions/billing-actions'
import { useOrg } from '@/shared/providers/org-provider'

interface SubInfo {
  planName: string
  planSlug: string
  status: string
  trialEnd: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export function SubscriptionBanner() {
  const { organizationId } = useOrg()
  const [sub, setSub] = useState<SubInfo | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function fetchSub() {
      const supabase = createClient()
      const { data } = await supabase
        .from('subscriptions')
        .select('status, trial_end, current_period_end, cancel_at_period_end, plan:plans(name, slug)')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        const plan = data.plan as unknown as { name: string; slug: string }
        setSub({
          planName: plan?.name || 'Gratis',
          planSlug: plan?.slug || 'free',
          status: data.status,
          trialEnd: data.trial_end,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
        })
      }
    }
    fetchSub()
  }, [organizationId])

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const result = await createBillingPortalSession(
        organizationId,
        window.location.href
      )
      if (result.url) {
        window.location.href = result.url
      }
    } finally {
      setPortalLoading(false)
    }
  }

  if (!sub) return null

  const isTrial = sub.status === 'trialing'
  const isPastDue = sub.status === 'past_due'
  const daysLeft = sub.trialEnd
    ? Math.max(0, Math.ceil((new Date(sub.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  if (!isTrial && !isPastDue && !sub.cancelAtPeriodEnd) return null

  return (
    <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
      isPastDue
        ? 'bg-red-500/10 border border-red-500/20'
        : sub.cancelAtPeriodEnd
          ? 'bg-yellow-500/10 border border-yellow-500/20'
          : 'bg-[#009e59]/10 border border-[#009e59]/20'
    }`}>
      <div>
        <p className={`text-sm font-medium ${
          isPastDue ? 'text-red-300' : sub.cancelAtPeriodEnd ? 'text-yellow-300' : 'text-emerald-300'
        }`}>
          {isPastDue
            ? 'Pago vencido - Por favor actualiza tu metodo de pago'
            : sub.cancelAtPeriodEnd
              ? `Plan ${sub.planName} se cancelara al final del periodo`
              : `Prueba gratuita: ${daysLeft} dias restantes en plan ${sub.planName}`
          }
        </p>
      </div>
      <Button
        variant="ghost"
        onClick={handleManageBilling}
        disabled={portalLoading}
      >
        {portalLoading ? 'Cargando...' : 'Gestionar Facturacion'}
      </Button>
    </div>
  )
}
