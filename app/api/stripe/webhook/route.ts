import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'

import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { accountPlan, stripeEvent } from '@/lib/db/schema'
import { getPlan, type PlanId } from '@/lib/plans'

// Stripe must reach the raw body, so this route runs on the Node.js runtime
// and reads the request text directly (no body parsing/caching).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Grants entitlements for a plan to the user that owns the Stripe customer. */
async function applyPlan(
  customerId: string,
  planId: PlanId,
  opts: { subscriptionId?: string; status?: string; currentPeriodEnd?: number } = {},
) {
  const plan = getPlan(planId)
  if (!plan) return

  const rows = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.stripeCustomerId, customerId))
    .limit(1)
  const row = rows[0]
  if (!row) return

  // Pay-as-you-go adds credits; subscriptions reset to the monthly allotment.
  const nextCredits = plan.unlimited
    ? 0
    : plan.mode === 'payment'
      ? row.credits + plan.credits
      : plan.credits

  await db
    .update(accountPlan)
    .set({
      planId: plan.id,
      credits: nextCredits,
      unlimited: plan.unlimited,
      ...(opts.subscriptionId ? { stripeSubscriptionId: opts.subscriptionId } : {}),
      ...(opts.status ? { subscriptionStatus: opts.status } : {}),
      ...(opts.currentPeriodEnd
        ? { currentPeriodEnd: new Date(opts.currentPeriodEnd * 1000) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(accountPlan.stripeCustomerId, customerId))
}

/** Revokes all entitlements when a subscription ends or lapses. */
async function revokePlan(customerId: string, status: string) {
  await db
    .update(accountPlan)
    .set({
      planId: null,
      credits: 0,
      unlimited: false,
      subscriptionStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(accountPlan.stripeCustomerId, customerId))
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.log('[v0] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret)
  } catch (err) {
    console.log('[v0] Webhook signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency: record the event id first; if it already exists, skip.
  try {
    await db.insert(stripeEvent).values({ id: event.id, type: event.type })
  } catch {
    // Duplicate delivery — already processed.
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Only grant when payment actually succeeded.
        if (session.payment_status === 'paid' || session.mode === 'subscription') {
          const customerId = session.customer as string
          const planId = session.metadata?.planId as PlanId | undefined
          if (customerId && planId) {
            await applyPlan(customerId, planId, {
              subscriptionId: (session.subscription as string) ?? undefined,
              status: session.mode === 'subscription' ? 'active' : undefined,
            })
          }
        }
        break
      }

      case 'invoice.paid': {
        // Recurring renewal — reset the monthly credit allotment.
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const sub = invoice.parent?.subscription_details?.subscription
        const subscriptionId = typeof sub === 'string' ? sub : sub?.id
        const planId = invoice.parent?.subscription_details?.metadata?.planId as
          | PlanId
          | undefined
        if (customerId && planId) {
          await applyPlan(customerId, planId, {
            subscriptionId,
            status: 'active',
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const planId = sub.metadata?.planId as PlanId | undefined
        const periodEnd = sub.items.data[0]?.current_period_end
        if (sub.status === 'active' || sub.status === 'trialing') {
          if (planId) {
            await applyPlan(customerId, planId, {
              subscriptionId: sub.id,
              status: sub.status,
              currentPeriodEnd: periodEnd,
            })
          }
        } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
          await revokePlan(customerId, sub.status)
        } else {
          // past_due / incomplete — keep access but record the status.
          await db
            .update(accountPlan)
            .set({ subscriptionStatus: sub.status, updatedAt: new Date() })
            .where(eq(accountPlan.stripeCustomerId, customerId))
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await revokePlan(sub.customer as string, 'canceled')
        break
      }

      default:
        break
    }
  } catch (err) {
    console.log('[v0] Webhook handler error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
