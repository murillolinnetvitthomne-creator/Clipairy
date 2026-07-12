'use client'

import { Check, Clapperboard, CreditCard, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

type TransitionKind = 'auth' | 'checkout' | 'portal' | 'loading'

export function TransitionOverlay({
  kind,
  visible = true,
  contained = false,
}: {
  kind: TransitionKind
  visible?: boolean
  contained?: boolean
}) {
  const { t } = useI18n()
  if (!visible) return null

  const copy = t.transition[kind]
  const Icon = kind === 'checkout' || kind === 'portal' ? CreditCard : LockKeyhole

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden bg-background px-4 py-10',
        contained ? 'min-h-[70vh] w-full' : 'fixed inset-0 z-50 min-h-dvh w-screen',
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-8 flex items-center gap-2.5 text-foreground">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Clapperboard aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Clipairy</span>
        </div>

        <div className="relative mb-7 flex size-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-primary/15 bg-primary/5" />
          <LoaderCircle className="absolute inset-0 size-24 animate-spin text-primary motion-reduce:animate-none" strokeWidth={1} aria-hidden="true" />
          <span className="flex size-14 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-foreground/10">
            <Icon aria-hidden="true" />
          </span>
        </div>

        <h2 className="font-display text-2xl font-bold text-balance text-foreground">{copy.title}</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">{copy.description}</p>

        <div className="mt-7 flex w-full items-center gap-2" aria-hidden="true">
          <span className="h-1.5 flex-1 rounded-full bg-primary" />
          <span className="h-1.5 flex-1 animate-pulse rounded-full bg-primary/45 motion-reduce:animate-none" />
          <span className="h-1.5 flex-1 rounded-full bg-muted" />
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <Check className="text-primary" aria-hidden="true" />
          {copy.trust}
        </div>
      </div>
    </div>
  )
}
