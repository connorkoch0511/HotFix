import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const isOrgSetup    = createRouteMatcher(['/org-setup'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const isApi = req.nextUrl.pathname.startsWith('/api/')
  const { userId, orgId, redirectToSignIn } = await auth()

  if (!userId) {
    // API routes return 401; page routes redirect to sign-in
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : redirectToSignIn()
  }

  // For page routes only: require an active org
  if (!orgId && !isOrgSetup(req) && !isApi) {
    return NextResponse.redirect(new URL('/org-setup', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
