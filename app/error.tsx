'use client'

import Link from 'next/link'
import { CircleAlert, Clapperboard, RotateCcw } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="justify-items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Clapperboard aria-hidden="true" />
          </span>
          <CardTitle className="font-display text-2xl text-balance">{t.transition.errorTitle}</CardTitle>
          <CardDescription className="max-w-sm leading-relaxed text-pretty">{t.auth.genericError}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-destructive/5 text-destructive ring-1 ring-destructive/15">
            <CircleAlert aria-hidden="true" />
          </span>
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            {t.transition.retry}
          </Button>
          <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
            {t.transition.home}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
