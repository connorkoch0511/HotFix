import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.join(__dirname, 'screenshots')

test.describe('Admin Panel', () => {
  // Merged into one test: the admin page calls Clerk's getOrganizationMembershipList API
  // which can take 8-15min on a cold start. One navigation is much better than three.
  test.setTimeout(900000)

  test('shows user management table, role permissions, and admin link', async ({ page }) => {
    await page.goto('/admin', { timeout: 300000 })
    await page.waitForLoadState('load')
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible({ timeout: 480000 })

    await expect(page.getByText('Manage user roles and access permissions.')).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'admin-panel.png'), fullPage: true })

    // Scope to <p> elements to avoid matching <option> elements in role dropdowns
    await expect(page.getByText('Role Permissions')).toBeVisible()
    await expect(page.locator('p', { hasText: 'end_user' })).toBeVisible()
    await expect(page.locator('p', { hasText: 'technician' })).toBeVisible()
    await expect(page.locator('p', { hasText: 'admin' }).first()).toBeVisible()

    await page.screenshot({ path: path.join(SCREENSHOTS, 'admin-roles.png'), fullPage: true })

    await expect(page.getByRole('link', { name: /admin/i })).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test.setTimeout(120000)

  test('navbar renders on all main pages', async ({ page }) => {
    for (const url of ['/', '/tickets', '/admin']) {
      await page.goto(url)
      await page.waitForLoadState('load')
      await expect(page.getByRole('link', { name: 'HotFix' })).toBeVisible({ timeout: 30000 })
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Tickets' })).toBeVisible()
    }
  })

  test('unauthenticated users are redirected to sign-in', async ({ browser }) => {
    // Use a fresh context with no stored auth
    const ctx  = await browser.newContext({ storageState: undefined })
    const page = await ctx.newPage()

    await page.goto('/')
    await expect(page).toHaveURL(/sign-in/)
    await ctx.close()
  })
})
