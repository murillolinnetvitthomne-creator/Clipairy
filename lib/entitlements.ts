import 'server-only'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { accountPlan } from '@/lib/db/schema'
import { getPlan, type PlanId } from '@/lib/plans'

/**
 * Central entitlement helpers. Both the PayPal capture flow and the verified
 * PayPal webhook call these, so granting/revoking access lives in one place
 * and can never be triggered directly by the browser.
 */

async function upsertPlanRow(userId: string, values: Partial<typeof accountPlan.$inferInsert>) {
  const existing = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .limit(1)

  if (existing[0]) {
    await db
      .update(accountPlan)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(accountPlan.userId, userId))
  } else {
    await db.insert(accountPlan).values({ userId, ...values })
  }
}

/** Adds pay-as-you-go credits for a one-time PayPal purchase. */
export async function grantOneTimeCredits(userId: string, planId: PlanId) {
  const plan = getPlan(planId)
  if (!plan || plan.mode !== 'payment') throw new Error('Invalid one-time plan')

  const existing = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .limit(1)

  const currentCredits = existing[0]?.credits ?? 0
  await upsertPlanRow(userId, {
    planId: plan.id,
    credits: currentCredits + plan.credits,
    unlimited: false,
    paymentProvider: 'paypal',
  })
}

/**
 * Activates (or renews) a PayPal subscription plan. Growth resets to its
 * monthly credit allotment; Team is unlimited. Called on activation and on
 * each successful recurring payment.
 */
export async function activateSubscription(params: {
  userId: string
  planId: PlanId
  subscriptionId: string
  status: string
}) {
  const plan = getPlan(params.planId)
  if (!plan || plan.mode !== 'subscription') throw new Error('Invalid subscription plan')

  await upsertPlanRow(params.userId, {
    planId: plan.id,
    credits: plan.unlimited ? 0 : plan.credits,
    unlimited: plan.unlimited,
    paymentProvider: 'paypal',
    paypalSubscriptionId: params.subscriptionId,
    paypalStatus: params.status,
  })
}

/** Updates only the stored PayPal status (e.g. SUSPENDED) without wiping access. */
export async function setPaypalStatus(subscriptionId: string, status: string) {
  await db
    .update(accountPlan)
    .set({ paypalStatus: status, updatedAt: new Date() })
    .where(eq(accountPlan.paypalSubscriptionId, subscriptionId))
}

/**
 * Revokes access for a cancelled/expired PayPal subscription. Clears the plan
 * so the user can no longer generate, but keeps the row and history.
 */
export async function deactivateSubscription(subscriptionId: string, status: string) {
  await db
    .update(accountPlan)
    .set({
      planId: null,
      credits: 0,
      unlimited: false,
      paypalStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(accountPlan.paypalSubscriptionId, subscriptionId))
}

/** Maps a PayPal subscription plan id back to our internal plan id. */
export function planIdFromPaypalPlan(paypalPlanId: string): PlanId | null {
  if (paypalPlanId && paypalPlanId === process.env.PAYPAL_PLAN_GROWTH) return 'growth'
  if (paypalPlanId && paypalPlanId === process.env.PAYPAL_PLAN_TEAM) return 'team'
  return null
}
