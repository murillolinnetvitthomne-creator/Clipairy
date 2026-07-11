'use client'

import { Globe, Check } from 'lucide-react'
import { useI18n } from '@/components/i18n-provider'
import { LOCALES } from '@/lib/i18n/dictionaries'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  const current = LOCALES.find((l) => l.code === locale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.lang.label}
        className={
          'inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card/60 px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring ' +
          (className ?? '')
        }
      >
        <Globe className="size-4" aria-hidden="true" />
        <span className="font-medium">{current?.short ?? 'EN'}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className="flex items-center justify-between gap-3"
          >
            <span>{l.label}</span>
            {l.code === locale && (
              <Check className="size-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
