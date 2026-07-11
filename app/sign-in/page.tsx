import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/account')

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <AuthForm mode="sign-in" />
    </main>
  )
}
