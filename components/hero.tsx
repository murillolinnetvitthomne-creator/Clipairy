'use client'

import Image from 'next/image'
import { ArrowRight, Play, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

const platforms = ['TikTok', 'Reels', 'Shorts']

export function Hero() {
  const { t } = useI18n()

  return (
    <section id="top" className="overflow-hidden border-b border-border/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center">
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            {t.hero.badge}
          </span>

          <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            {t.hero.titleLine1}
            <br />
            <span className="text-primary">{t.hero.titleHighlight}</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t.hero.subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="group font-medium"
              nativeButton={false}
              render={<a href="#studio" />}
            >
              {t.hero.ctaStart}
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
              render={<a href="#preview" />}
            >
              <Play className="size-4" aria-hidden="true" />
              {t.hero.ctaPreview}
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {t.hero.exportTo}
            </span>
            {platforms.map((p) => (
              <span key={p} className="text-sm font-semibold text-foreground/80">
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <Image
              src="/hero-phone.png"
              alt={t.hero.phoneAlt}
              width={640}
              height={800}
              className="h-auto w-full object-cover"
              priority
            />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              {t.hero.phoneBadge}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
