import { Page, expect } from '@playwright/test'
import { TEST_USER, ROUTES, TIMEOUTS } from '../fixtures/test-data'

/**
 * Helper function to log in a user
 * @param page - Playwright page object
 * @param phone - Phone number (defaults to TEST_USER.phone)
 * @param password - Password (defaults to TEST_USER.password)
 */
export async function login(
  page: Page,
  phone: string = TEST_USER.phone,
  password: string = TEST_USER.password
): Promise<void> {
  // Navigate to login page
  await page.goto(ROUTES.login)

  // Wait for the login form to be visible
  await expect(page.locator('form')).toBeVisible({ timeout: TIMEOUTS.medium })

  // Fill in phone number
  await page.locator('input[id="phone"]').fill(phone)

  // Fill in password
  await page.locator('input[id="password"]').fill(password)

  // Click login button
  await page.locator('button[type="submit"]').click()

  // Wait for navigation to complete (should redirect to dashboard)
  await page.waitForURL('/', { timeout: TIMEOUTS.navigation })
}

/**
 * Helper function to log out the current user
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to settings page where logout button exists
  await page.goto(ROUTES.settings)

  // Click logout button
  await page.locator('button:has-text("Dang xuat")').click()

  // Confirm logout if there is a confirmation modal
  const confirmButton = page.locator('.ant-modal-confirm-btns button:has-text("OK")')
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click()
  }

  // Wait for redirect to login page
  await page.waitForURL('**/login', { timeout: TIMEOUTS.navigation })
}

/**
 * Check if user is logged in by checking for protected content
 * @param page - Playwright page object
 * @returns boolean indicating if user appears to be logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check if we can access dashboard content
    await page.goto('/')
    await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.short })

    // If we are redirected to login, we are not logged in
    const currentUrl = page.url()
    return !currentUrl.includes('/login')
  } catch {
    return false
  }
}

/**
 * Ensure the user is logged in, logging in if necessary
 * @param page - Playwright page object
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  const loggedIn = await isLoggedIn(page)
  if (!loggedIn) {
    await login(page)
  }
}

/**
 * Wait for page to be fully loaded with all API calls completed
 * @param page - Playwright page object
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.long })
}
