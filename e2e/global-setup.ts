import { test as setup, expect } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  const secretKey   = process.env.CLERK_SECRET_KEY
  const email       = process.env.TEST_USER_EMAIL
  const databaseUrl = process.env.DATABASE_URL

  if (!secretKey || !email) {
    throw new Error('Missing CLERK_SECRET_KEY or TEST_USER_EMAIL in .env.local')
  }
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env.local')
  }

  const clerk = createClerkClient({ secretKey })

  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  if (!users.length) throw new Error(`No Clerk user found with email: ${email}`)

  const userId = users[0].id

  const { token } = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 60,
  })

  // Load the sign-in page so Clerk's JS SDK is present on the window
  await page.goto('/sign-in')
  await page.waitForFunction(() => !!(window as any).Clerk?.loaded, { timeout: 15000 })

  // Use Clerk's browser SDK to sign in with the token, bypassing device verification
  await page.evaluate(async (signInToken) => {
    const clerkInstance = (window as any).Clerk
    const result = await clerkInstance.client.signIn.create({
      strategy: 'ticket',
      ticket: signInToken,
    })
    if (result.status !== 'complete') {
      throw new Error(`Unexpected sign-in status: ${result.status}`)
    }
    await clerkInstance.setActive({ session: result.createdSessionId })
  }, token)

  // Navigate to home — triggers profile auto-creation via the layout
  await page.goto('/')
  await expect(page).toHaveURL('/')

  // Warm up other routes so Next.js dev compiles them before test workers start
  await page.goto('/tickets')
  await page.goto('/admin')

  await page.context().storageState({ path: authFile })

  // Promote test user to admin so admin-gated tests pass
  const sql = neon(databaseUrl)
  await sql`UPDATE profiles SET role = 'admin' WHERE id = ${userId}`
})
