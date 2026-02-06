import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Stripe webhook data types (runtime shape)
interface StripeSubscriptionData {
  id: string
  status: string
  metadata: Record<string, string>
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  trial_end: number | null
}

interface StripeCheckoutSessionData {
  metadata?: Record<string, string>
  subscription: string | null
  customer: string | null
}

interface StripeInvoiceData {
  subscription: string | null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: { type: string; data: { object: unknown } }
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as unknown as typeof event
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as StripeCheckoutSessionData
      const orgId = session.metadata?.organization_id
      const subscriptionId = session.subscription

      if (orgId && subscriptionId) {
        const subResponse = await stripe.subscriptions.retrieve(subscriptionId)
        const subscription = subResponse as unknown as StripeSubscriptionData
        const planSlug = subscription.metadata.plan_slug

        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('slug', planSlug)
          .single()

        if (plan) {
          await supabase.from('subscriptions').upsert({
            organization_id: orgId,
            plan_id: plan.id,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscriptionId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
          }, { onConflict: 'stripe_subscription_id' })
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as StripeSubscriptionData
      await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_end: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as StripeSubscriptionData
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as StripeInvoiceData
      if (invoice.subscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
