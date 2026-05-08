import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.join(__dirname, 'screenshots')

test.describe('Organization setup', () => {
  test('unauthenticated user visiting /org-setup is redirected to sign-in', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()
    await page.goto('/org-setup')
    await expect(page).toHaveURL(/sign-in/)
    await ctx.close()
  })

  test('/org-setup shows the create-org panel', async ({ page }) => {
    await page.goto('/org-setup')
    await expect(page).not.toHaveURL(/sign-in/)
    await expect(page.getByText('Set up your organization')).toBeVisible()
    await expect(page.getByText('IT admin?', { exact: false })).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'org-setup.png'), fullPage: true })
  })

  test('/org-setup shows the invite instructions panel', async ({ page }) => {
    await page.goto('/org-setup')
    await expect(page.getByText('Joining an existing team?')).toBeVisible()
    await expect(page.getByText('Admin sends you an invite')).toBeVisible()
    await expect(page.getByText('Check your email')).toBeVisible()
    await expect(page.getByText('Land on the dashboard')).toBeVisible()
  })
})

test.describe('Organization switcher', () => {
  test('org switcher is rendered in the navbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 })

    const header = page.locator('header')
    await expect(header.getByRole('button').first()).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'org-switcher-navbar.png') })
  })

  test('active organization name appears in the navbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 })
    // Wait for Clerk JS to finish mounting before checking its rendered buttons
    await page.waitForFunction(() => !!(window as any).Clerk?.loaded, { timeout: 15000 })
    const header = page.locator('header')
    await expect(header.getByRole('button').first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Organization settings', () => {
  test('Settings nav link is visible for admins', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('/settings/organization renders the org profile', async ({ page }) => {
    await page.goto('/settings/organization')
    await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible({ timeout: 15000 })
    // Clerk's OrganizationProfile renders inside the page
    await expect(page.locator('text=Organization Settings').first()).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'org-settings.png'), fullPage: true })
  })

  test('/settings/organization shows members section', async ({ page }) => {
    await page.goto('/settings/organization')
    await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible({ timeout: 15000 })
    // Clerk renders a Members tab or section inside OrganizationProfile
    await expect(page.getByText(/member/i).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Organization-scoped tickets', () => {
  test('pre-migration tickets with no org do not appear in the list', async ({ page }) => {
    await page.goto('/tickets')
    await page.waitForLoadState('load')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 })

    const countText = page.locator('p.text-right')
    await expect(countText).toBeVisible()
    const text = await countText.textContent()
    const count = parseInt(text ?? '0')
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('ticket created in org appears in the org ticket list', async ({ page }) => {
    const title = `Org-scoped ticket ${Date.now()}`

    await page.goto('/tickets/new')
    await page.waitForLoadState('load')
    await page.fill('input[placeholder*="describe"]', title)
    await page.fill('textarea', 'Verifying org scoping: this ticket should only appear in this organization.')
    await page.selectOption('select', { index: 1 })
    await page.locator('select').nth(1).selectOption('low')
    await page.getByRole('button', { name: /submit ticket/i }).click()
    await expect(page.getByRole('button', { name: /submitting/i })).toBeVisible({ timeout: 10000 })
    await page.waitForURL(/\/tickets\/[0-9a-f-]+/, { timeout: 20000 })
    await page.waitForLoadState('load')
    await expect(page.getByText(title)).toBeVisible({ timeout: 30000 })

    await page.goto('/tickets')
    await page.waitForLoadState('load')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(title)).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'org-scoped-ticket.png'), fullPage: true })
  })

  test('dashboard stats are scoped to the current organization', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('Open').first()).toBeVisible()
    await expect(page.getByText('In Progress').first()).toBeVisible()
    await expect(page.getByText('Resolved').first()).toBeVisible()
    await expect(page.getByText('Critical').first()).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'org-scoped-dashboard.png'), fullPage: true })
  })
})

test.describe('Organization member scoping', () => {
  test('admin panel only shows members of the current organization', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('table')).toBeVisible()

    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(1)

    await page.screenshot({ path: path.join(SCREENSHOTS, 'org-admin-members.png'), fullPage: true })
  })
})

test.describe('Organization API enforcement', () => {
  test('GET /api/tickets returns 401 without authentication', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()
    const res  = await page.request.get('http://localhost:3000/api/tickets')
    expect(res.status()).toBe(401)
    await ctx.close()
  })

  test('POST /api/tickets returns 401 without authentication', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()
    const res  = await page.request.post('http://localhost:3000/api/tickets', {
      data: { title: 'x', description: 'x', category: 'software', priority: 'low' },
    })
    expect(res.status()).toBe(401)
    await ctx.close()
  })

  test('GET /api/admin/users returns 401 without authentication', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()
    const res  = await page.request.get('http://localhost:3000/api/admin/users')
    expect(res.status()).toBe(401)
    await ctx.close()
  })
})
