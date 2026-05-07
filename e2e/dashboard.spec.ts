import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.join(__dirname, 'screenshots')

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 })
  })

  test('shows all four stat cards', async ({ page }) => {
    await expect(page.getByText('Open').first()).toBeVisible()
    await expect(page.getByText('In Progress').first()).toBeVisible()
    await expect(page.getByText('Resolved').first()).toBeVisible()
    await expect(page.getByText('Critical').first()).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'dashboard.png'),
      fullPage: true,
    })
  })

  test('shows recent tickets list', async ({ page }) => {
    await expect(page.getByText('Recent Tickets')).toBeVisible()
    const rows = page.locator('a[href^="/tickets/"]')
    await expect(rows.first()).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'dashboard-tickets.png'),
      fullPage: true,
    })
  })

  test('New Ticket button navigates to form', async ({ page }) => {
    await page.getByRole('link', { name: /new ticket/i }).first().click()
    await expect(page).toHaveURL('/tickets/new')
  })

  test('View all link navigates to ticket list', async ({ page }) => {
    await page.getByRole('link', { name: /view all/i }).click()
    await page.waitForURL('/tickets', { timeout: 15000 })
    await expect(page).toHaveURL('/tickets')
  })
})
