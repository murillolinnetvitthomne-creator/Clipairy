'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { accountPlan } from '@/lib/db/schema'
import { PLANS, getPlan, type PlanId } from '@/lib/plans'
import { eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export type AccountState = {
  planId: PlanId | null
  planName: string | null
  credits: number
  unlimited: boolean
  canTrial: boolean
}

/**
 * Returns the current user's plan and remaining credits.
 * A user with no purchased plan has no credits and cannot trial.
 */
export async function getAccount(): Promise<AccountState> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .limit(1)

  const row = rows[0]
  if (!row || !row.planId) {
    return { planId: null, planName: null, credits: 0, unlimited: false, canTrial: false }
  }

  const plan = getPlan(row.planId)
  const canTrial = row.unlimited || row.credits > 0
  return {
    planId: row.planId as PlanId,
    planName: plan?.name ?? null,
    credits: row.credits,
    unlimited: row.unlimited,
    canTrial,
  }
}

/**
 * Simulates purchasing/subscribing to a plan. In a real app this would run
 * after a successful Stripe checkout. It grants the plan's credits.
 */
export async function purchasePlan(planId: PlanId): Promise<AccountState> {
  const userId = await getUserId()
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) throw new Error('Invalid plan')

  const existing = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .limit(1)

  if (existing[0]) {
    // Pay-as-you-go adds credits; subscriptions reset to the plan allotment.
    const newCredits =
      plan.id === 'payg' ? existing[0].credits + plan.credits : plan.credits
    await db
      .update(accountPlan)
      .set({
        planId: plan.id,
        credits: plan.unlimited ? 0 : newCredits,
        unlimited: plan.unlimited,
        updatedAt: new Date(),
      })
      .where(eq(accountPlan.userId, userId))
  } else {
    await db.insert(accountPlan).values({
      userId,
      planId: plan.id,
      credits: plan.unlimited ? 0 : plan.credits,
      unlimited: plan.unlimited,
    })
  }

  revalidatePath('/account')
  revalidatePath('/')
  return getAccount()
}

/**
 * Consumes one credit when a trial generation starts. Enforces that the user
 * has a plan and available credits. Returns the updated account state.
 */
export async function consumeCredit(): Promise<AccountState> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .limit(1)

  const row = rows[0]
  if (!row || !row.planId) {
    throw new Error('NO_PLAN')
  }

  if (!row.unlimited) {
    if (row.credits <= 0) {
      throw new Error('NO_CREDITS')
    }
    await db
      .update(accountPlan)
      .set({ credits: sql`${accountPlan.credits} - 1`, updatedAt: new Date() })
      .where(eq(accountPlan.userId, userId))
  }

  revalidatePath('/account')
  revalidatePath('/')
  return getAccount()
}
