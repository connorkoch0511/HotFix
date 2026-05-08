import { test as setup, expect } from '@playwright/test'
import { createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup.setTimeout(120000)

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
  const sql   = neon(databaseUrl)

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

  // Create or reuse a test organization
  const { data: memberships } = await clerk.users.getOrganizationMembershipList({ userId })
  let orgId: string
  if (memberships.length > 0) {
    orgId = memberships[0].organization.id
  } else {
    const org = await clerk.organizations.createOrganization({
      name: 'Test Organization',
      createdBy: userId,
    })
    orgId = org.id
  }

  // Set the org as active in the browser session
  await page.goto('/sign-in')
  await page.waitForFunction(() => !!(window as any).Clerk?.loaded, { timeout: 15000 })
  await page.evaluate(async (oid) => {
    await (window as any).Clerk.setActive({ organization: oid })
  }, orgId)

  // Navigate to home — triggers profile auto-creation via the layout
  await page.goto('/')
  await expect(page).toHaveURL('/')

  // Promote test user to admin so admin-gated tests pass
  await sql`UPDATE profiles SET role = 'admin' WHERE id = ${userId}`

  // Ensure at least one org-scoped ticket exists so list/detail tests have rows to work with
  const existing = await sql`SELECT id FROM tickets WHERE organization_id = ${orgId} LIMIT 1`
  if (!existing.length) {
    await sql`
      INSERT INTO tickets (organization_id, title, description, category, priority, status, created_by)
      VALUES (${orgId}, 'Seeded setup ticket', 'Created by global-setup for E2E list/detail tests.', 'software', 'medium', 'open', ${userId})
    `
  }

  // Warm up routes so Next.js/webpack compiles them before test workers start
  await page.goto('/tickets')
  await page.waitForLoadState('load')
  await page.goto('/tickets/new')
  await page.waitForLoadState('load')
  await page.goto('/admin')
  await page.waitForLoadState('load')

  // Warm up the ticket detail route to pre-compile the dynamic [id] segment
  const [firstTicket] = await sql`SELECT id FROM tickets WHERE organization_id = ${orgId} LIMIT 1`
  if (firstTicket) {
    await page.goto(`/tickets/${firstTicket.id}`)
    await page.waitForLoadState('load')
  }

  await page.context().storageState({ path: authFile })
})
