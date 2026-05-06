import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import type { Profile } from '@/lib/types'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
