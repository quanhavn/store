import { test, expect } from '@playwright/test'
import { TEST_USER, INVALID_USER, ROUTES, TIMEOUTS } from './fixtures/test-data'
import { login, logout, waitForPageLoad } from './helpers/auth'

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should load login page correctly', async ({ page }) => {
      await page.goto(ROUTES.login)
      await waitForPageLoad(page)

      // Check page title or header
      await expect(page.locator('h3:has-text("Quan Ly Cua Hang")')).toBeVisible()

      // Check login form elements are present
      await expect(page.locator('input[id="phone"]')).toBeVisible()
      await expect(page.locator('input[id="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Check the form has correct labels
      await expect(page.locator('text=So dien thoai')).toBeVisible()
      await expect(page.locator('text=Mat khau')).toBeVisible()
    })

    test('should show registration toggle', async ({ page }) => {
      await page.goto(ROUTES.login)
      await waitForPageLoad(page)

      // Check for registration link
      const registerLink = page.locator('text=Chua co tai khoan? Dang ky')
      await expect(registerLink).toBeVisible()

      // Click to toggle to registration form
      await registerLink.click()

      // Check registration form elements
      await expect(page.locator('input[id="storeName"]')).toBeVisible()
      await expect(page.locator('text=Ten cua hang')).toBeVisible()

      // Toggle back to login
      const loginLink = page.locator('text=Da co tai khoan? Dang nhap')
      await expect(loginLink).toBeVisible()
      await loginLink.click()

      // Verify we are back to login form
      await expect(page.locator('input[id="storeName"]')).not.toBeVisible()
    })
  })

  test.describe('Login Functionality', () => {
    test('should login with valid credentials', async ({ page }) => {
      await login(page, TEST_USER.phone, TEST_USER.password)

      // Verify successful login by checking we are on the dashboard
      await expect(page).toHaveURL('/')

      // Check for dashboard content
      await expect(page.locator('text=Cua hang')).toBeVisible({ timeout: TIMEOUTS.medium })
    })

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto(ROUTES.login)
      await waitForPageLoad(page)

      // Fill in invalid credentials
      await page.locator('input[id="phone"]').fill(INVALID_USER.phone)
      await page.locator('input[id="password"]').fill(INVALID_USER.password)

      // Click login button
      await page.locator('button[type="submit"]').click()

      // Wait for error message
      await expect(
        page.locator('.ant-message-error, .ant-message-notice-error')
      ).toBeVisible({ timeout: TIMEOUTS.medium })

      // Verify we are still on login page
      await expect(page).toHaveURL(/.*login/)
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto(ROUTES.login)
      await waitForPageLoad(page)

      // Try to submit empty form
      await page.locator('button[type="submit"]').click()

      // Check for validation messages
      await expect(page.locator('text=Vui long nhap so dien thoai')).toBeVisible()
      await expect(page.locator('text=Vui long nhap mat khau')).toBeVisible()
    })

    test('should validate phone number format', async ({ page }) => {
      await page.goto(ROUTES.login)
      await waitForPageLoad(page)

      // Enter invalid phone format
      await page.locator('input[id="phone"]').fill('123')
      await page.locator('input[id="password"]').fill('validpassword')
      await page.locator('button[type="submit"]').click()

      // Check for phone validation error
      await expect(page.locator('text=So dien thoai phai co 10-11 chu so')).toBeVisible()
    })

    test('should validate password length', async ({ page }) => {
      await page.goto(ROUTES.login)
      await waitForPageLoad(page)

      // Enter short password
      await page.locator('input[id="phone"]').fill('0912345678')
      await page.locator('input[id="password"]').fill('123')
      await page.locator('button[type="submit"]').click()

      // Check for password validation error
      await expect(page.locator('text=Mat khau phai co it nhat 6 ky tu')).toBeVisible()
    })
  })

  test.describe('Logout Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each logout test
      await login(page)
    })

    test('should logout successfully', async ({ page }) => {
      await logout(page)

      // Verify we are on login page
      await expect(page).toHaveURL(/.*login/)

      // Verify login form is visible
      await expect(page.locator('input[id="phone"]')).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({
      page,
    }) => {
      // Clear any existing session/cookies
      await page.context().clearCookies()

      // Try to access dashboard directly
      await page.goto('/')

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/, { timeout: TIMEOUTS.navigation })
    })

    test('should redirect to login when accessing POS without auth', async ({ page }) => {
      await page.context().clearCookies()
      await page.goto(ROUTES.pos)
      await expect(page).toHaveURL(/.*login/, { timeout: TIMEOUTS.navigation })
    })

    test('should redirect to login when accessing inventory without auth', async ({
      page,
    }) => {
      await page.context().clearCookies()
      await page.goto(ROUTES.inventory)
      await expect(page).toHaveURL(/.*login/, { timeout: TIMEOUTS.navigation })
    })

    test('should redirect to login when accessing reports without auth', async ({ page }) => {
      await page.context().clearCookies()
      await page.goto(ROUTES.reports)
      await expect(page).toHaveURL(/.*login/, { timeout: TIMEOUTS.navigation })
    })

    test('should redirect to login when accessing finance without auth', async ({ page }) => {
      await page.context().clearCookies()
      await page.goto(ROUTES.finance)
      await expect(page).toHaveURL(/.*login/, { timeout: TIMEOUTS.navigation })
    })
  })
})
