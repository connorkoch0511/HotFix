import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getDb } from '@/lib/db'
import { profiles } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import Navbar from '@/components/Navbar'
import type { Profile } from '@/lib/types'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Get profile, auto-create on first login
  let profile = await getDb().query.profiles.findFirst({ where: eq(profiles.id, userId) })
  if (!profile) {
    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
    const fullName = clerkUser?.fullName ?? ''
    ;[profile] = await getDb().insert(profiles).values({ id: userId, email, fullName }).returning()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
