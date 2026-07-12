import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getAccount } from '@/app/actions/account'
import { AccountDashboard } from '@/components/account-dashboard'

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const account = await getAccount()

  // PayPal config is resolved server-side. The client id is public; the
  // subscription plan ids come from env and may be absent until configured.
  const paypalConfig = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? process.env.PAYPAL_CLIENT_ID ?? '',
    growthPlanId: process.env.PAYPAL_PLAN_GROWTH ?? null,
    teamPlanId: process.env.PAYPAL_PLAN_TEAM ?? null,
  }

  return (
    <main className="min-h-screen">
      <AccountDashboard
        user={{ name: session.user.name, email: session.user.email }}
        initialAccount={account}
        userId={session.user.id}
        paypalConfig={paypalConfig}
      />
    </main>
  )
}
