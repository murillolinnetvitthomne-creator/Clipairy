'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { accountPlan } from '@/lib/db/schema'
import { getPlan, type PlanId } from '@/lib/plans'
import { stripe } from '@/lib/stripe'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

async function getOrigin() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')
  if (origin) return origin

  const host = requestHeaders.get('host')
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https'
  if (host) return `${protocol}://${host}`

  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clipairy.com'
}

export async function createCheckoutSession(planId: PlanId) {
  const user = await getCurrentUser()
  const plan = getPlan(planId)
  if (!plan) throw new Error('Invalid plan')

  const existing = await db
    .select()
    .from(accountPlan)
    .where(eq(accountPlan.userId, user.id))
    .limit(1)

  let customerId = existing[0]?.stripeCustomerId ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    })
    customerId = customer.id

    await db
      .insert(accountPlan)
      .values({ userId: user.id, stripeCustomerId: customerId })
      .onConflictDoUpdate({
        target: accountPlan.userId,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      })
  }

  const origin = await getOrigin()
  const session = await stripe.checkout.sessions.create({
    mode: plan.billing,
    customer: customerId,
    client_reference_id: user.id,
    success_url: `${origin}/account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/account?payment=cancelled`,
    allow_promotion_codes: true,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.priceInCents,
          product_data: {
            name: `Clipairy ${plan.name}`,
            description: plan.description,
          },
          ...(plan.billing === 'subscription'
            ? { recurring: { interval: 'month' as const } }
            : {}),
        },
      },
    ],
    metadata: { userId: user.id, planId: plan.id },
    ...(plan.billing === 'subscription'
      ? { subscription_data: { metadata: { userId: user.id, planId: plan.id } } }
      : { payment_intent_data: { metadata: { userId: user.id, planId: plan.id } } }),
  })

  if (!session.url) throw new Error('Stripe Checkout URL was not created')
  return { url: session.url }
}

export async function createBillingPortalSession() {
  const user = await getCurrentUser()
  const rows = await db
    .select({ stripeCustomerId: accountPlan.stripeCustomerId })
    .from(accountPlan)
    .where(eq(accountPlan.userId, user.id))
    .limit(1)

  const customerId = rows[0]?.stripeCustomerId
  if (!customerId) throw new Error('No Stripe customer found')

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${await getOrigin()}/account`,
  })
  return { url: portal.url }
}
