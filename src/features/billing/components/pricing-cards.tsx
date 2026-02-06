'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Card, CardContent } from '@/shared/components'
import { Spinner } from '@/shared/components/spinner'
import { createCheckoutSession } from '@/features/billing/actions/billing-actions'
import { useOrg } from '@/shared/providers/org-provider'

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_yearly: number
  max_branches: number
  max_agents: number
  max_tickets_per_day: number
  features: string[]
  stripe_price_id: string | null
}

const FEATURE_LABELS: Record<string, string> = {
  queue_basic: 'Cola de turnos',
  kiosk: 'Modo kiosko',
  tv_display: 'Pantalla TV',
  appointments: 'Citas',
  reports_basic: 'Reportes basicos',
  reports_advanced: 'Reportes avanzados',
  email_notifications: 'Notificaciones email',
  sms_notifications: 'Notificaciones SMS',
  whatsapp_notifications: 'WhatsApp',
  ai_chatbot: 'Chatbot AI',
  ai_anomalies: 'Alertas AI',
  recurring_appointments: 'Citas recurrentes',
  thermal_printing: 'Impresion termica',
  branding: 'Logo y colores',
  white_label: 'White-label',
  api_access: 'API publica',
  priority_support: 'Soporte prioritario',
}

export function PricingCards() {
  const { organizationId } = useOrg()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    async function fetchPlans() {
      const supabase = createClient()
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      setPlans(data || [])
      setLoading(false)
    }
    fetchPlans()
  }, [])

  const handleSubscribe = async (planSlug: string) => {
    if (planSlug === 'free') return

    setCheckoutLoading(planSlug)
    try {
      const result = await createCheckoutSession(
        organizationId,
        planSlug,
        `${window.location.origin}/settings`
      )
      if (result.url) {
        window.location.href = result.url
      }
    } finally {
      setCheckoutLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              billing === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              billing === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Anual
            <span className="ml-1 text-xs text-green-600 font-bold">-17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const price = billing === 'yearly' && plan.price_yearly
            ? plan.price_yearly / 12
            : plan.price_monthly
          const isPopular = plan.slug === 'pro'

          return (
            <Card
              key={plan.id}
              className={`relative ${isPopular ? 'ring-2 ring-coopnama-primary' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-coopnama-primary text-white text-xs font-bold rounded-full">
                  Popular
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${price.toFixed(0)}
                  </span>
                  <span className="text-gray-500 text-sm">/mes</span>
                  {billing === 'yearly' && plan.price_yearly > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ${plan.price_yearly.toFixed(0)}/ano facturado anualmente
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {plan.max_branches === -1 ? 'Ilimitadas' : plan.max_branches}
                    </span> sucursales
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {plan.max_agents === -1 ? 'Ilimitados' : plan.max_agents}
                    </span> agentes
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {plan.max_tickets_per_day === -1 ? 'Ilimitados' : plan.max_tickets_per_day}
                    </span> turnos/dia
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {(plan.features as string[]).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {FEATURE_LABELS[feature] || feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPopular ? 'primary' : 'ghost'}
                  className="w-full"
                  onClick={() => handleSubscribe(plan.slug)}
                  disabled={plan.slug === 'free' || checkoutLoading !== null}
                >
                  {checkoutLoading === plan.slug ? (
                    <Spinner size="sm" />
                  ) : plan.slug === 'free' ? (
                    'Plan Actual'
                  ) : (
                    'Suscribirse'
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
