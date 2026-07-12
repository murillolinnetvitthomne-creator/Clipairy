import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { paypalEvent, paypalOrder } from '@/lib/db/schema'
import { verifyWebhookSignature, getSubscription } from '@/lib/paypal'
import {
  grantOneTimeCredits,
  activateSubscription,
  deactivateSubscription,
  setPaypalStatus,
  planIdFromPaypalPlan,
} from '@/lib/entitlements'
import type { PlanId } from '@/lib/plans'

// PayPal must reach this with the raw body for signature verification.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PayPalWebhookEvent = {
  id: string
  event_type: string
  resource?: {
    id?: string
    status?: string
    custom_id?: string
    plan_id?: string
    billing_agreement_id?: string
    supplementary_data?: { related_ids?: { subscription_id?: string } }
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()

  // 1) Verify the signature with PayPal before trusting anything.
  let verified = false
  try {
    verified = await verifyWebhookSignature({ headers: req.headers, rawBody })
  } catch (err) {
    console.log('[v0] PayPal webhook verify error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
  }
  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as PayPalWebhookEvent

  // 2) Idempotency: record the event id; skip if already processed.
  try {
    await db.insert(paypalEvent).values({ id: event.id, type: event.event_type })
  } catch {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // 3) Handle the event. On failure, remove the marker so PayPal can retry.
  try {
    await handleEvent(event)
    return NextResponse.json({ received: true })
  } catch (err) {
    await db.delete(paypalEvent).where(eq(paypalEvent.id, event.id))
    console.log('[v0] PayPal webhook handler error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}

async function handleEvent(event: PayPalWebhookEvent) {
  const resource = event.resource ?? {}

  switch (event.event_type) {
    // One-time payment captured (pay-as-you-go).
    case 'PAYMENT.CAPTURE.COMPLETED': {
      // custom_id is "userId:planId"; fall back to the local order record.
      const custom = resource.custom_id
      if (custom && custom.includes(':')) {
        const [userId, planId] = custom.split(':')
        await grantIfOrderPending(resource.id, userId, planId as PlanId)
      }
      break
    }

    // Subscription became active (initial activation).
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.UPDATED': {
      const subId = resource.id
      if (!subId) break
      const sub = await getSubscription(subId)
      const planId = planIdFromPaypalPlan(sub.plan_id ?? '')
      const userId = sub.custom_id
      if (planId && userId && sub.status === 'ACTIVE') {
        await activateSubscription({ userId, planId, subscriptionId: subId, status: sub.status })
      } else if (sub.status) {
        await setPaypalStatus(subId, sub.status)
      }
      break
    }

    // Recurring payment succeeded — reset the monthly credit allotment.
    case 'PAYMENT.SALE.COMPLETED': {
      const subId =
        resource.billing_agreement_id ??
        resource.supplementary_data?.related_ids?.subscription_id
      if (!subId) break
      const sub = await getSubscription(subId)
      const planId = planIdFromPaypalPlan(sub.plan_id ?? '')
      const userId = sub.custom_id
      if (planId && userId && sub.status === 'ACTIVE') {
        await activateSubscription({ userId, planId, subscriptionId: subId, status: sub.status })
      }
      break
    }

    // Subscription paused — keep the row but mark suspended.
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      if (resource.id) await setPaypalStatus(resource.id, 'SUSPENDED')
      break
    }

    // Subscription ended — revoke access.
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED': {
      if (resource.id) {
        await deactivateSubscription(resource.id, resource.status ?? 'CANCELLED')
      }
      break
    }

    default:
      // Unhandled event types are acknowledged so PayPal stops retrying.
      break
  }
}

/**
 * Grants one-time credits from a webhook only if the local order is still
 * pending, mirroring the capture action's idempotency guard.
 */
async function grantIfOrderPending(orderId: string | undefined, userId: string, planId: PlanId) {
  if (!orderId) {
    // No capture id to reconcile against; grant defensively is unsafe, so skip.
    return
  }

  const rows = await db.select().from(paypalOrder).where(eq(paypalOrder.id, orderId)).limit(1)
  const record = rows[0]

  // If we have a record, use its atomic transition. If not (capture id differs
  // from order id), we cannot safely reconcile, so rely on the capture action.
  if (!record) return
  if (record.status === 'captured') return

  const updated = await db
    .update(paypalOrder)
    .set({ status: 'captured', capturedAt: new Date() })
    .where(eq(paypalOrder.id, orderId))
    .returning({ id: paypalOrder.id })

  if (updated.length > 0) {
    await grantOneTimeCredits(userId, planId)
  }
}
