'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clapperboard, Menu, X, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { useI18n } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { data: session } = authClient.useSession()
  const isAuthed = !!session?.user
  const { t } = useI18n()

  const navLinks = [
    { label: t.nav.workflow, href: '#workflow' },
    { label: t.nav.preview, href: '#preview' },
    { label: t.nav.models, href: '#benefits' },
    { label: t.nav.pricing, href: '#pricing' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Clipairy</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label={t.header.mainNav}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          {isAuthed ? (
            <Button
              size="sm"
              className="font-medium"
              nativeButton={false}
              render={<Link href="/account" />}
            >
              <UserRound className="size-4" aria-hidden="true" />
              {t.header.account}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                {t.header.signIn}
              </Button>
              <Button
                size="sm"
                className="font-medium"
                nativeButton={false}
                render={<Link href="/sign-up" />}
              >
                {t.header.signUp}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.header.closeMenu : t.header.openMenu}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav
            className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4"
            aria-label={t.header.mobileNav}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            {isAuthed ? (
              <Button
                className="mt-2 font-medium"
                nativeButton={false}
                render={<Link href="/account" onClick={() => setOpen(false)} />}
              >
                {t.header.account}
              </Button>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="font-medium"
                  nativeButton={false}
                  render={<Link href="/sign-in" onClick={() => setOpen(false)} />}
                >
                  {t.header.signIn}
                </Button>
                <Button
                  className="font-medium"
                  nativeButton={false}
                  render={<Link href="/sign-up" onClick={() => setOpen(false)} />}
                >
                  {t.header.signUp}
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
