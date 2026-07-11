import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getAccount } from '@/app/actions/account'
import { AccountDashboard } from '@/components/account-dashboard'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const account = await getAccount()
  const { payment } = await searchParams

  return (
    <main className="min-h-screen">
      <AccountDashboard
        user={{ name: session.user.name, email: session.user.email }}
        initialAccount={account}
        paymentStatus={payment}
      />
    </main>
  )
}
