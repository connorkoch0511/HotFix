import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.join(__dirname, 'screenshots')

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('shows user management table', async ({ page }) => {
    await expect(page.getByText('Admin Panel')).toBeVisible()
    await expect(page.getByText('Manage user roles')).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'admin-panel.png'),
      fullPage: true,
    })
  })

  test('shows role permissions reference card', async ({ page }) => {
    await expect(page.getByText('Role Permissions')).toBeVisible()
    await expect(page.getByText('end_user')).toBeVisible()
    await expect(page.getByText('technician')).toBeVisible()
    await expect(page.getByText('admin')).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'admin-roles.png'),
      fullPage: true,
    })
  })

  test('admin link is visible in navbar', async ({ page }) => {
    const adminLink = page.getByRole('link', { name: /admin/i })
    await expect(adminLink).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('navbar renders on all main pages', async ({ page }) => {
    for (const url of ['/', '/tickets', '/admin']) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('HotFix')).toBeVisible()
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
