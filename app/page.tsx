import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getAccount, type AccountState } from '@/app/actions/account'
import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { Studio } from '@/components/studio'
import { ModelsSection } from '@/components/models-section'
import { Pricing } from '@/components/pricing'
import { CtaFooter } from '@/components/cta-footer'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  const isAuthed = !!session?.user

  let account: AccountState | null = null
  if (isAuthed) {
    account = await getAccount()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Studio isAuthed={isAuthed} account={account} />
        <ModelsSection />
        <Pricing />
        <CtaFooter />
      </main>
    </div>
  )
}
