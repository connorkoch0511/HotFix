import { chromium, type FullConfig } from '@playwright/test'

export default async function globalSetup(_config: FullConfig) {
  const email    = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in .env.local.\n' +
      'Add them to run the Playwright tests:\n' +
      '  TEST_USER_EMAIL=you@example.com\n' +
      '  TEST_USER_PASSWORD=yourpassword'
    )
  }

  const browser = await chromium.launch()
  const page    = await browser.newPage()

  await page.goto('http://localhost:3000/sign-in')

  // Clerk renders the sign-in form asynchronously
  await page.waitForSelector('input[name="identifier"]', { timeout: 15000 })
  await page.fill('input[name="identifier"]', email)
  await page.getByRole('button', { name: /continue/i }).click()

  // Second step: password
  await page.waitForSelector('input[type="password"]', { timeout: 10000 })
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: /continue/i }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('http://localhost:3000/', { timeout: 15000 })

  // Save authenticated session for all tests
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()

  console.log('✓ Auth session saved')
}
