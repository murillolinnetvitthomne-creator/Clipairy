'use client'

import type React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clapperboard, Loader2 } from 'lucide-react'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password, name })
        if (error) throw new Error(error.message ?? t.auth.signUpFailed)
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message ?? t.auth.signInFailed)
      }
      router.push('/account')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.genericError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-bold">Clipairy</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-balance">
          {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          {isSignUp ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        {isSignUp && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t.auth.name}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.auth.namePlaceholder}
              required
              autoComplete="name"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.passwordPlaceholder}
            required
            minLength={8}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-2 font-medium" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSignUp ? t.auth.signUpBtn : t.auth.signInBtn}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{' '}
          <Link
            href={isSignUp ? '/sign-in' : '/sign-up'}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? t.auth.goSignIn : t.auth.goSignUp}
          </Link>
        </p>
      </form>
    </div>
  )
}
