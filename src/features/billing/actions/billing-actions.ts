'use server'

import { stripe } from '@/lib/stripe/config'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function createCheckoutSession(
  organizationId: string,
  planSlug: string,
  returnUrl: string
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Stripe not configured' }
  }

  const supabase = await createServerClient()

  // Get plan details
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', planSlug)
    .single()

  if (!plan || !plan.stripe_price_id) {
    return { error: 'Plan not found or not configured in Stripe' }
  }

  // Get or create Stripe customer
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', organizationId)
    .single()

  if (!org) return { error: 'Organization not found' }

  let customerId = org.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { organization_id: organizationId },
    })
    customerId = customer.id

    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', organizationId)
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
    subscription_data: {
      metadata: { organization_id: organizationId, plan_slug: planSlug },
      trial_period_days: planSlug === 'free' ? undefined : 14,
    },
    metadata: { organization_id: organizationId },
  })

  return { url: session.url }
}

export async function createBillingPortalSession(
  organizationId: string,
  returnUrl: string
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Stripe not configured' }
  }

  const supabase = await createServerClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single()

  if (!org?.stripe_customer_id) {
    return { error: 'No billing account found' }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: returnUrl,
  })

  return { url: session.url }
}

export async function getSubscriptionStatus(organizationId: string) {
  const supabase = await createServerClient()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sub) {
    // Default to free plan
    const { data: freePlan } = await supabase
      .from('plans')
      .select('*')
      .eq('slug', 'free')
      .single()

    return {
      plan: freePlan,
      status: 'free' as const,
      isActive: true,
      isTrial: false,
    }
  }

  return {
    plan: sub.plan,
    status: sub.status,
    isActive: sub.status === 'active' || sub.status === 'trialing',
    isTrial: sub.status === 'trialing',
    trialEnd: sub.trial_end,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  }
}
