import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getAccount } from '@/app/actions/account'
import { AccountDashboard } from '@/components/account-dashboard'

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const account = await getAccount()

  return (
    <main className="min-h-screen">
      <AccountDashboard
        user={{ name: session.user.name, email: session.user.email }}
        initialAccount={account}
      />
    </main>
  )
}
