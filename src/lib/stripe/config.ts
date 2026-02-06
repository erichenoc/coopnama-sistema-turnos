import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return _stripe
}

// Lazy accessor - only throws when actually used
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripeServer() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const PLANS = {
  free: { name: 'Gratis', slug: 'free' },
  basic: { name: 'Basico', slug: 'basic' },
  pro: { name: 'Profesional', slug: 'pro' },
  enterprise: { name: 'Empresa', slug: 'enterprise' },
} as const

export type PlanSlug = keyof typeof PLANS
