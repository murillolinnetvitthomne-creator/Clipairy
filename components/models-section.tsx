'use client'

import { AudioLines, Brain, Eye, Film } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'

const icons = [Brain, Eye, Film, AudioLines]
export function ModelsSection() {
  const { t } = useI18n()

  return (
    <section id="benefits" className="scroll-mt-20 border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t.models.eyebrow}
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t.models.title}
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">{t.models.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.models.caps.map((cap, i) => {
            const Icon = icons[i]
            return (
              <div
                key={cap.title}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{cap.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {cap.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
