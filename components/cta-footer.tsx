'use client'

import { ArrowRight, Clapperboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n, fill } from '@/components/i18n-provider'

export function CtaFooter() {
  const { t } = useI18n()

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              {t.cta.title}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
              {t.cta.subtitle}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="group font-medium"
                nativeButton={false}
                render={<a href="#studio" />}
              >
                {t.cta.start}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="font-medium"
                nativeButton={false}
                render={<a href="#pricing" />}
              >
                {t.cta.viewPricing}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Clapperboard className="size-4" aria-hidden="true" />
            </span>
            <span className="font-display text-sm font-bold">Clipairy</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {fill(t.footer.copyright, { year: new Date().getFullYear() })} · {t.footer.tagline}
          </p>
          <nav className="flex gap-6 text-xs text-muted-foreground" aria-label={t.footer.nav}>
            <a href="#workflow" className="transition-colors hover:text-foreground">
              {t.nav.workflow}
            </a>
            <a href="#benefits" className="transition-colors hover:text-foreground">
              {t.nav.models}
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              {t.nav.pricing}
            </a>
          </nav>
        </div>
      </footer>
    </>
  )
}
