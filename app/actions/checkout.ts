'use server'

import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { accountPlan } from '@/lib/db/schema'
import { getPlan, type PlanId } from '@/lib/plans'
import { stripe, getBaseUrl } from '@/lib/stripe'

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

/**
 * Ensures the user has a Stripe customer, reusing the id stored on their
 * account_plan row when present. This keeps one customer per user so the
 * Customer Portal and subscription lifecycle stay consistent.
 */
async function getOrCreateCustomerId(userId: string, email: string, name: string) {
  const rows = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, userId))
    .limit(1)
  const existing = rows[0]

  if (existing?.stripeCustomerId) return existing.stripeCustomerId

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  })

  if (existing) {
    await db
      .update(accountPlan)
      .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
      .where(eq(accountPlan.userId, userId))
  } else {
    // Create a plan row with NO entitlements yet — only webhooks grant access.
    await db.insert(accountPlan).values({
      userId,
      planId: null,
      credits: 0,
      unlimited: false,
      stripeCustomerId: customer.id,
    })
  }

  return customer.id
}

/**
 * Creates a Stripe Checkout Session and returns its hosted URL. The caller
 * redirects the browser to this URL. Entitlements are never granted here —
 * only the verified webhook does that after payment succeeds.
 */
export async function createCheckoutSession(planId: PlanId): Promise<{ url: string }> {
  const user = await getSessionUser()
  const plan = getPlan(planId)
  if (!plan) throw new Error('Invalid plan')

  const customerId = await getOrCreateCustomerId(user.id, user.email, user.name)
  const baseUrl = getBaseUrl()

  const session = await stripe.checkout.sessions.create({
    mode: plan.mode,
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: plan.currency,
          product_data: { name: `Clipairy ${plan.name}` },
          unit_amount: plan.amountInCents,
          ...(plan.mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      },
    ],
    // Attach identity so the webhook can resolve the user without trusting the client.
    client_reference_id: user.id,
    metadata: { userId: user.id, planId: plan.id },
    ...(plan.mode === 'subscription'
      ? { subscription_data: { metadata: { userId: user.id, planId: plan.id } } }
      : {}),
    success_url: `${baseUrl}/account?checkout=success`,
    cancel_url: `${baseUrl}/account?checkout=cancelled`,
  })

  if (!session.url) throw new Error('Failed to create checkout session')
  return { url: session.url }
}

/**
 * Opens the Stripe Customer Portal so subscribers can manage or cancel their
 * subscription and payment method. Returns the portal URL to redirect to.
 */
export async function createPortalSession(): Promise<{ url: string }> {
  const user = await getSessionUser()
  const rows = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, user.id))
    .limit(1)
  const customerId = rows[0]?.stripeCustomerId
  if (!customerId) throw new Error('NO_CUSTOMER')

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getBaseUrl()}/account`,
  })

  return { url: session.url }
}
