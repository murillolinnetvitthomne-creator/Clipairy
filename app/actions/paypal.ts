'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { accountPlan, paypalOrder } from '@/lib/db/schema'
import { getPlan, type PlanId } from '@/lib/plans'
import {
  createOrder,
  captureOrder,
  getSubscription,
  cancelSubscription,
} from '@/lib/paypal'
import { grantOneTimeCredits, activateSubscription } from '@/lib/entitlements'

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

/**
 * Creates a PayPal one-time order for the pay-as-you-go plan and records it
 * locally as 'created'. Returns the PayPal order id for the JS SDK to approve.
 * No credits are granted here.
 */
export async function createPaypalOrder(planId: PlanId): Promise<{ orderId: string }> {
  const user = await getSessionUser()
  const plan = getPlan(planId)
  if (!plan) throw new Error('Invalid plan')
  if (plan.mode !== 'payment') throw new Error('This plan is a subscription, not a one-time order')

  const order = await createOrder({
    amountInCents: plan.amountInCents,
    currency: plan.currency,
    customId: `${user.id}:${plan.id}`,
    description: `Clipairy ${plan.name}`,
  })

  await db.insert(paypalOrder).values({
    id: order.id,
    userId: user.id,
    planId: plan.id,
    status: 'created',
  })

  return { orderId: order.id }
}

/**
 * Captures an approved PayPal order and grants credits exactly once. Uses the
 * local paypal_order row as the idempotency guard so a retried capture (or a
 * webhook racing with this call) can never double-grant.
 */
export async function capturePaypalOrder(orderId: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser()

  const rows = await db
    .select()
    .from(paypalOrder)
    .where(eq(paypalOrder.id, orderId))
    .limit(1)
  const record = rows[0]

  // The order must exist and belong to the calling user.
  if (!record || record.userId !== user.id) throw new Error('Order not found')
  if (record.status === 'captured') return { ok: true }

  const result = await captureOrder(orderId)
  if (result.status !== 'COMPLETED') {
    throw new Error(`Order not completed: ${result.status}`)
  }

  // Atomically flip to 'captured'; only the first transition grants credits.
  const updated = await db
    .update(paypalOrder)
    .set({ status: 'captured', capturedAt: new Date() })
    .where(and(eq(paypalOrder.id, orderId), eq(paypalOrder.status, 'created')))
    .returning({ id: paypalOrder.id })

  if (updated.length > 0) {
    await grantOneTimeCredits(record.userId, record.planId as PlanId)
  }

  revalidatePath('/account')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Confirms a PayPal subscription created client-side. Re-fetches it from
 * PayPal to verify status and ownership before granting access, so nothing
 * relies on values reported by the browser.
 */
export async function activatePaypalSubscription(
  subscriptionId: string,
): Promise<{ ok: boolean }> {
  const user = await getSessionUser()

  const sub = await getSubscription(subscriptionId)
  // custom_id was set to the user id at creation time.
  if (sub.custom_id && sub.custom_id !== user.id) {
    throw new Error('Subscription does not belong to this user')
  }

  const planId = mapPaypalPlan(sub.plan_id)
  if (!planId) throw new Error('Unknown subscription plan')

  if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
    // Not active yet — webhook will finalize. Store the id/status only.
    await db
      .update(accountPlan)
      .set({ paypalSubscriptionId: subscriptionId, paypalStatus: sub.status, updatedAt: new Date() })
      .where(eq(accountPlan.userId, user.id))
    return { ok: false }
  }

  await activateSubscription({
    userId: user.id,
    planId,
    subscriptionId,
    status: sub.status,
  })

  revalidatePath('/account')
  revalidatePath('/')
  return { ok: true }
}

/** Cancels the caller's active PayPal subscription. */
export async function cancelPaypalSubscription(): Promise<{ ok: boolean }> {
  const user = await getSessionUser()
  const rows = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, user.id))
    .limit(1)
  const subId = rows[0]?.paypalSubscriptionId
  if (!subId) throw new Error('NO_SUBSCRIPTION')

  await cancelSubscription(subId, 'Cancelled by user from account page')
  // The webhook (BILLING.SUBSCRIPTION.CANCELLED) revokes access authoritatively.
  await db
    .update(accountPlan)
    .set({ paypalStatus: 'CANCELLED', updatedAt: new Date() })
    .where(eq(accountPlan.userId, user.id))

  revalidatePath('/account')
  return { ok: true }
}

function mapPaypalPlan(paypalPlanId: string | undefined): PlanId | null {
  if (!paypalPlanId) return null
  if (paypalPlanId === process.env.PAYPAL_PLAN_GROWTH) return 'growth'
  if (paypalPlanId === process.env.PAYPAL_PLAN_TEAM) return 'team'
  return null
}
