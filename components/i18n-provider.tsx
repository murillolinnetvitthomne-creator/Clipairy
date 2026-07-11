'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  dictionaries,
  type Dict,
  type Locale,
} from '@/lib/i18n/dictionaries'

const STORAGE_KEY = 'reelforge-locale'

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dict
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always start from the default locale so the server and first client render
  // match (avoids hydration mismatch); the stored locale is applied post-mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && stored in dictionaries && stored !== locale) {
      setLocaleState(stored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

/** Helper for interpolating {name}, {year} etc. into a template string. */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}
