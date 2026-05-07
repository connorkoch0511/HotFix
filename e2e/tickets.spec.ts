import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.join(__dirname, 'screenshots')

test.describe('Tickets List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets')
    await page.waitForLoadState('networkidle')
  })

  test('renders ticket table with rows', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible()
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'tickets-list.png'),
      fullPage: true,
    })
  })

  test('filter by status narrows results', async ({ page }) => {
    await page.getByRole('link', { name: 'open' }).first().click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/status=open/)

    // All visible status badges should be "Open"
    const badges = page.locator('span', { hasText: 'Open' })
    await expect(badges.first()).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'tickets-filtered-open.png'),
      fullPage: true,
    })
  })

  test('filter by priority', async ({ page }) => {
    await page.getByRole('link', { name: 'critical' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/priority=critical/)

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'tickets-filtered-critical.png'),
      fullPage: true,
    })
  })

  test('clicking a ticket row opens the detail page', async ({ page }) => {
    const firstTicketLink = page.locator('tbody tr a').first()
    await firstTicketLink.click()
    await page.waitForURL(/\/tickets\/[0-9a-f-]+/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]+/)
    await expect(page.getByText('Description')).toBeVisible()
  })
})

test.describe('New Ticket', () => {
  test('creates a ticket and redirects to detail', async ({ page }) => {
    await page.goto('/tickets/new')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'new-ticket-form.png'),
      fullPage: true,
    })

    const title = `Playwright test ticket ${Date.now()}`
    await page.fill('input[placeholder*="describe"]', title)
    await page.fill('textarea', 'Created by Playwright automated test. Steps: open app, fill form, submit.')
    await page.selectOption('select', { index: 1 }) // category
    await page.locator('select').nth(1).selectOption('high')

    await page.getByRole('button', { name: /submit ticket/i }).click()

    // Should redirect to the new ticket's detail page
    await page.waitForURL(/\/tickets\/[0-9a-f-]+/, { timeout: 10000 })
    await page.waitForLoadState('load')
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'ticket-detail.png'),
      fullPage: true,
    })
  })
})

test.describe('Ticket Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr a').first().click()
    await page.waitForURL(/\/tickets\/[0-9a-f-]+/)
    await page.waitForLoadState('networkidle')
  })

  test('shows description, comments, and audit tabs', async ({ page }) => {
    await expect(page.getByText('Description')).toBeVisible()
    await expect(page.getByRole('button', { name: /comments/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /audit trail/i })).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'ticket-detail-comments.png'),
      fullPage: true,
    })
  })

  test('audit trail tab shows history entries', async ({ page }) => {
    await page.getByRole('button', { name: /audit trail/i }).click()
    await expect(page.getByText(/created this ticket/i)).toBeVisible()

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'ticket-detail-audit.png'),
      fullPage: true,
    })
  })

  test('can post a comment', async ({ page }) => {
    const comment = `Test comment ${Date.now()}`
    await page.fill('textarea[placeholder*="comment"]', comment)
    await page.getByRole('button', { name: /^post$/i }).click()

    await expect(page.getByText(comment)).toBeVisible({ timeout: 8000 })

    await page.screenshot({
      path: path.join(SCREENSHOTS, 'ticket-comment-posted.png'),
      fullPage: true,
    })
  })

  test('sidebar shows ticket metadata', async ({ page }) => {
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Priority')).toBeVisible()
    await expect(page.getByText('Category')).toBeVisible()
    await expect(page.getByText('Submitted by')).toBeVisible()
  })
})
