'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { PLANS } from '@/lib/plans'

// Which marketing plan (by index) is highlighted as most popular.
const HIGHLIGHT_INDEX = 1

export function Pricing() {
  const { t } = useI18n()

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t.pricing.eyebrow}
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">{t.pricing.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {t.pricing.plans.map((plan, i) => {
            const catalogPlan = PLANS[i]
            const highlight = i === HIGHLIGHT_INDEX
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  highlight
                    ? 'border-primary bg-card shadow-lg shadow-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {t.pricing.mostPopular}
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-display text-4xl font-bold tracking-tight">
                    {catalogPlan.price}
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">
                    {catalogPlan.billing === 'payment' ? t.account.perUse : t.account.perMonth}
                  </span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full font-medium"
                  variant={highlight ? 'default' : 'outline'}
                  nativeButton={false}
                  render={<a href="/account" />}
                >
                  {plan.cta}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
