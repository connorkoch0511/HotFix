import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.join(__dirname, 'screenshots')

test.describe('Changes List', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/changes')
    await page.waitForLoadState('load')
    await expect(page.getByRole('heading', { name: 'Change Requests' })).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 })
  })

  test('renders the change requests page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'New Change' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'changes-list.png'), fullPage: true })
  })

  test('shows filter chips for type, risk, and status', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'standard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'normal' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'emergency' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'low risk' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'pending review' })).toBeVisible()
  })

  test('filter by type narrows results', async ({ page }) => {
    await page.getByRole('link', { name: 'normal' }).first().click()
    await page.waitForURL(/type=normal/, { timeout: 15000 })
    await expect(page).toHaveURL(/type=normal/)

    await page.screenshot({ path: path.join(SCREENSHOTS, 'changes-filtered.png'), fullPage: true })
  })

  test('clicking a change row opens the detail page', async ({ page }) => {
    const firstLink = page.locator('tbody tr a').first()
    await expect(firstLink).toBeVisible({ timeout: 15000 })
    await firstLink.click()
    await page.waitForURL(/\/changes\/[0-9a-f-]+/, { timeout: 90000 })
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+/)
    await expect(page.getByText('Audit Trail').first()).toBeVisible({ timeout: 90000 })
  })

  test('Changes link is visible in navbar', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Changes' })).toBeVisible()
  })
})

test.describe('New Change Request', () => {
  test.setTimeout(120000)

  test('renders the new change form', async ({ page }) => {
    await page.goto('/changes/new')
    await page.waitForLoadState('load')
    await expect(page.getByRole('heading', { name: 'New Change Request' })).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('button', { name: /submit change request/i })).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'change-new-form.png'), fullPage: true })
  })

  test('submits a change request and redirects to detail', async ({ page }) => {
    await page.goto('/changes/new')
    await page.waitForLoadState('load')
    await expect(page.getByRole('button', { name: /submit change request/i })).toBeVisible({ timeout: 30000 })

    const title = `E2E Change ${Date.now()}`
    await page.fill('input', title)
    await page.fill('textarea', 'Change description from Playwright test.')
    await page.locator('select').first().selectOption('normal')
    await page.locator('select').nth(1).selectOption('high')

    await page.getByRole('button', { name: /submit change request/i }).click()
    await expect(page.getByRole('button', { name: /submitting/i })).toBeVisible({ timeout: 15000 })

    await page.waitForURL(/\/changes\/[0-9a-f-]+/, { timeout: 90000 })
    await page.waitForLoadState('load')
    await expect(page.getByText(title)).toBeVisible({ timeout: 60000 })

    await page.screenshot({ path: path.join(SCREENSHOTS, 'change-detail-after-create.png'), fullPage: true })
  })
})

test.describe('Change Detail', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/changes')
    await page.waitForLoadState('load')
    await expect(page.locator('tbody tr a').first()).toBeVisible({ timeout: 30000 })
    await page.locator('tbody tr a').first().click()
    await page.waitForURL(/\/changes\/[0-9a-f-]+/, { timeout: 90000 })
    await expect(page.getByText('Audit Trail').first()).toBeVisible({ timeout: 60000 })
  })

  test('shows description section', async ({ page }) => {
    // Use .first() since 'Description' appears in both the section label and the
    // description text when description text happens to contain that word
    await expect(page.getByText('Description').first()).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'change-detail.png'), fullPage: true })
  })

  test('shows audit trail with history entries', async ({ page }) => {
    await expect(page.getByText('Audit Trail').first()).toBeVisible()
    await expect(page.getByText(/submitted this change request/i)).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'change-detail-audit.png'), fullPage: true })
  })

  test('sidebar shows type, risk, and status badges', async ({ page }) => {
    await expect(page.getByText('Status').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Type').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Risk Level').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Requested by').first()).toBeVisible({ timeout: 15000 })
  })

  test('admin approve/reject buttons visible on pending change', async ({ page }) => {
    // Navigate to a pending review change specifically
    await page.goto('/changes')
    await page.waitForLoadState('load')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 })

    const pendingLink = page.locator('tbody tr').filter({ hasText: 'Pending Review' }).locator('a').first()
    const count = await pendingLink.count()
    if (count === 0) return  // no pending changes — skip

    await pendingLink.click()
    await page.waitForURL(/\/changes\/[0-9a-f-]+/, { timeout: 90000 })
    await expect(page.getByText('Audit Trail').first()).toBeVisible({ timeout: 30000 })

    await expect(page.getByRole('button', { name: /approve/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /reject/i })).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'change-detail-admin-actions.png'), fullPage: true })
  })

  test('approve flow updates status to approved', async ({ page }) => {
    await page.goto('/changes')
    await page.waitForLoadState('load')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 })

    const pendingLink = page.locator('tbody tr').filter({ hasText: 'Pending Review' }).locator('a').first()
    const count = await pendingLink.count()
    if (count === 0) return  // no pending changes to approve

    await pendingLink.click()
    await page.waitForURL(/\/changes\/[0-9a-f-]+/, { timeout: 90000 })
    await expect(page.getByRole('button', { name: /approve/i })).toBeVisible({ timeout: 30000 })

    await page.getByRole('button', { name: /approve/i }).click()
    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /confirm/i }).click()

    // Status badge should update to Approved — use .first() to avoid strict mode
    // violation with lowercase 'approved' in the audit trail
    await expect(page.getByText('Approved').first()).toBeVisible({ timeout: 30000 })

    await page.screenshot({ path: path.join(SCREENSHOTS, 'change-approved.png'), fullPage: true })
  })
})

test.describe('Dashboard change stats', () => {
  test('dashboard shows change request stat cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('Pending Review')).toBeVisible()
    // 'Implemented' appears in both the stat card and the Recharts axis — use .first()
    await expect(page.getByText('Implemented').first()).toBeVisible()
    await expect(page.getByText('Emergency').first()).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'dashboard.png'), fullPage: true })
  })

  test('dashboard renders charts section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('Tickets by Status')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Changes by Status')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: path.join(SCREENSHOTS, 'dashboard-charts.png'), fullPage: true })
  })
})

test.describe('Change API enforcement', () => {
  test('GET /api/changes returns 401 without authentication', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()
    const res  = await page.request.get('http://localhost:3000/api/changes')
    expect(res.status()).toBe(401)
    await ctx.close()
  })

  test('POST /api/changes returns 401 without authentication', async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()
    const res  = await page.request.post('http://localhost:3000/api/changes', {
      data: { title: 'x', description: 'x', type: 'normal', riskLevel: 'low' },
    })
    expect(res.status()).toBe(401)
    await ctx.close()
  })
})
