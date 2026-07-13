'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { type AccountState } from '@/app/actions/account'
import { createCheckoutSession, createPortalSession } from '@/app/actions/checkout'
import { getPlan, PLANS, type PlanId } from '@/lib/plans'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TransitionOverlay } from '@/components/transition-overlay'
import {
  Clapperboard,
  Check,
  Zap,
  Infinity as InfinityIcon,
  LogOut,
  Sparkles,
  ArrowRight,
  Loader2,
  CreditCard,
  CircleAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

export function AccountDashboard({
  user,
  initialAccount,
}: {
  user: { name: string; email: string }
  initialAccount: AccountState
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [account] = useState<AccountState>(initialAccount)
  const [pending, startTransition] = useTransition()
  const [buyingId, setBuyingId] = useState<PlanId | null>(null)
  const [portalPending, setPortalPending] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Payment result banner driven by the Stripe redirect query param.
  const checkoutResult = searchParams.get('checkout')

  // Clean the query param from the URL once shown, so a refresh won't repeat it.
  useEffect(() => {
    if (checkoutResult) {
      const timer = setTimeout(() => router.replace('/account'), 6000)
      return () => clearTimeout(timer)
    }
  }, [checkoutResult, router])

  function handlePurchase(planId: PlanId) {
    setPaymentError(null)
    setBuyingId(planId)
    startTransition(async () => {
      try {
        const [{ url }] = await Promise.all([
          createCheckoutSession(planId),
          new Promise((resolve) => setTimeout(resolve, 650)),
        ])
        window.location.assign(url)
      } catch {
        setBuyingId(null)
        setPaymentError(t.transition.checkoutError)
      }
    })
  }

  function handleManageBilling() {
    setPaymentError(null)
    setPortalPending(true)
    startTransition(async () => {
      try {
        const [{ url }] = await Promise.all([
          createPortalSession(),
          new Promise((resolve) => setTimeout(resolve, 650)),
        ])
        window.location.assign(url)
      } catch {
        setPortalPending(false)
        setPaymentError(t.transition.checkoutError)
      }
    })
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  const hasPlan = account.planId !== null
  const currentPlanName = getPlan(account.planId)?.name ?? account.planId

  return (
    <>
      <TransitionOverlay kind={portalPending ? 'portal' : 'checkout'} visible={buyingId !== null || portalPending} />
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {/* Top bar */}
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-4" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold">Clipairy</span>
        </Link>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="size-4" aria-hidden="true" />
          {t.account.signOut}
        </Button>
      </header>

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-balance md:text-3xl">
          {t.account.greeting.replace('{name}', user.name)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      {/* Payment result banner */}
      {checkoutResult === 'success' && (
        <div
          role="status"
          className="mb-8 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
        >
          <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {t.account.checkoutSuccess}
        </div>
      )}
      {checkoutResult === 'cancelled' && (
        <div
          role="status"
          className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          <XCircle className="size-5 shrink-0" aria-hidden="true" />
          {t.account.checkoutCancelled}
        </div>
      )}

      {paymentError && (
        <Alert className="mb-8">
          <CircleAlert className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <AlertTitle>{t.transition.errorTitle}</AlertTitle>
            <AlertDescription>{paymentError}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Current status card */}
      <section aria-label={t.account.currentPlan} className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t.account.currentPlan}</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {currentPlanName ?? t.account.notSubscribed}
          </p>
          {!hasPlan && (
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              {t.account.noPlanDesc}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t.account.remainingCredits}</p>
          <div className="mt-2 flex items-center gap-2">
            {account.unlimited ? (
              <span className="flex items-center gap-2 font-display text-2xl font-bold text-primary">
                <InfinityIcon className="size-6" aria-hidden="true" />
                {t.account.unlimited}
              </span>
            ) : (
              <span className="font-display text-2xl font-bold">
                {account.credits}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  {t.account.times}
                </span>
              </span>
            )}
          </div>
          <div className="mt-4">
            {account.canTrial ? (
              <Button
                size="sm"
                render={<Link href="/#studio" />}
                nativeButton={false}
                className="font-medium"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {t.account.goCreate}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t.account.buyToTrial}</p>
            )}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section aria-label={t.account.chooseTitle}>
        <div className="mb-5 flex items-center gap-2">
          <Zap className="size-5 text-primary" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold">
            {hasPlan ? t.account.upgradeTitle : t.account.chooseTitle}
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = account.planId === plan.id
            const isBuying = buyingId === plan.id && pending
            const period = plan.mode === 'payment' ? plan.period : t.account.perMonth
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border p-6 ${
                  plan.highlight ? 'border-primary bg-card' : 'bg-card'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    {t.account.mostPopular}
                  </span>
                )}
                <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                  <span className="mb-1 text-sm text-muted-foreground">{period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">
                  {plan.description}
                </p>

                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="text-pretty">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6 w-full font-medium"
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={isCurrent || pending}
                  onClick={() => handlePurchase(plan.id)}
                >
                  {isBuying && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {isCurrent ? t.account.current : isBuying ? t.account.redirecting : plan.cta}
                  {!isCurrent && !isBuying && <ArrowRight className="size-4" aria-hidden="true" />}
                </Button>
              </div>
            )
          })}
        </div>

        {account.hasSubscription && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={pending}
            >
              {portalPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard className="size-4" aria-hidden="true" />
              )}
              {portalPending ? t.account.openingPortal : t.account.manageBilling}
            </Button>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">{t.account.demoNote}</p>
      </section>
      </div>
    </>
  )
}
