'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { PLANS } from '@/lib/plans'

export function Pricing() {
  const { t } = useI18n()
  const oneTimePlans = PLANS.filter((plan) => plan.mode === 'payment')
  const subscription = PLANS.find((plan) => plan.id === 'professional')

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t.pricing.eyebrow}
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            按时长购买，价格清晰透明
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            1 个额度代表 8 秒。长视频按实际使用的 8 秒分段扣除额度。
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {oneTimePlans.map((plan) => (
            <div key={plan.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-primary">获得 {plan.credits} 个 8 秒额度</p>
              <Button className="mt-6 w-full" variant="outline" nativeButton={false} render={<Link href="/account" />}>
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {subscription && (
          <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-primary bg-card p-6 shadow-lg shadow-primary/10 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">最划算</span>
              <h3 className="mt-4 font-display text-2xl font-bold">{subscription.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{subscription.description}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {subscription.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 md:text-right">
              <div className="flex items-end gap-1 md:justify-end">
                <span className="font-display text-4xl font-bold">{subscription.price}</span>
                <span className="mb-1 text-sm text-muted-foreground">{subscription.period}</span>
              </div>
              <Button className="mt-4 w-full md:w-auto" nativeButton={false} render={<Link href="/account" />}>
                {subscription.cta}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
