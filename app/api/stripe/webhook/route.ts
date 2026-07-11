import { db } from '@/lib/db'
import { accountPlan, stripeEvent } from '@/lib/db/schema'
import { getPlan, type PlanId } from '@/lib/plans'
import { stripe } from '@/lib/stripe'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

function idOf(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id ?? null
}

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return

  const userId = session.metadata?.userId ?? session.client_reference_id
  const planId = session.metadata?.planId as PlanId | undefined
  const plan = getPlan(planId)
  if (!userId || !plan) throw new Error('Checkout metadata is incomplete')

  const customerId = idOf(session.customer)
  const subscriptionId = idOf(session.subscription)

  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(accountPlan)
      .where(eq(accountPlan.userId, userId))
      .limit(1)
    const current = rows[0]

    if (plan.billing === 'payment') {
      await tx
        .insert(accountPlan)
        .values({
          userId,
          planId: 'payg',
          credits: plan.credits,
          stripeCustomerId: customerId,
        })
        .onConflictDoUpdate({
          target: accountPlan.userId,
          set: {
            planId: current?.stripeSubscriptionId ? current.planId : 'payg',
            credits: sql`${accountPlan.credits} + ${plan.credits}`,
            stripeCustomerId: customerId,
            updatedAt: new Date(),
          },
        })
      return
    }

    await tx
      .insert(accountPlan)
      .values({
        userId,
        planId: plan.id,
        credits: plan.unlimited ? 0 : plan.credits,
        unlimited: plan.unlimited,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
      })
      .onConflictDoUpdate({
        target: accountPlan.userId,
        set: {
          planId: plan.id,
          credits: plan.unlimited ? 0 : plan.credits,
          unlimited: plan.unlimited,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: 'active',
          updatedAt: new Date(),
        },
      })
  })
}

async function handleRenewal(invoice: Stripe.Invoice) {
  if (invoice.billing_reason === 'subscription_create' || invoice.status !== 'paid') return

  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription)
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata.userId
  const plan = getPlan(subscription.metadata.planId)
  if (!userId || !plan || plan.billing !== 'subscription') return

  await db
    .update(accountPlan)
    .set({
      planId: plan.id,
      credits: plan.unlimited ? 0 : plan.credits,
      unlimited: plan.unlimited,
      subscriptionStatus: subscription.status,
      updatedAt: new Date(),
    })
    .where(eq(accountPlan.userId, userId))
}

async function updateSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId
  if (!userId) return

  const active = ['active', 'trialing'].includes(subscription.status)
  await db
    .update(accountPlan)
    .set({
      subscriptionStatus: subscription.status,
      ...(active
        ? {}
        : {
            planId: null,
            credits: 0,
            unlimited: false,
            stripeSubscriptionId: null,
          }),
      updatedAt: new Date(),
    })
    .where(eq(accountPlan.userId, userId))
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const inserted = await db
      .insert(stripeEvent)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvent.id })

    if (inserted.length === 0) return NextResponse.json({ received: true })

    switch (event.type) {
      case 'checkout.session.completed':
        await fulfillCheckout(event.data.object)
        break
      case 'invoice.paid':
        await handleRenewal(event.data.object)
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await updateSubscription(event.data.object)
        break
    }

    revalidatePath('/account')
    revalidatePath('/')
    return NextResponse.json({ received: true })
  } catch (error) {
    // Let Stripe retry. Remove the event marker because fulfillment did not finish.
    await db.delete(stripeEvent).where(eq(stripeEvent.id, event.id))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 },
    )
  }
}
