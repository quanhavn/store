import { test, expect } from '@playwright/test'
import { ROUTES, TIMEOUTS, PAYMENT_METHODS } from './fixtures/test-data'
import { login, waitForPageLoad } from './helpers/auth'

test.describe('POS (Point of Sale)', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page)
    // Navigate to POS page
    await page.goto(ROUTES.pos)
    await waitForPageLoad(page)
  })

  test.describe('POS Page Load', () => {
    test('should load POS page with correct elements', async ({ page }) => {
      // Check page header
      await expect(page.locator('h1:has-text("Ban hang")')).toBeVisible()

      // Check search input exists
      await expect(page.locator('input[placeholder*="Tim"]')).toBeVisible()

      // Check category filter exists
      await expect(page.locator('.ant-segmented, .category-filter')).toBeVisible()

      // Check floating cart button exists
      await expect(page.locator('.ant-float-btn')).toBeVisible()
    })

    test('should display product grid', async ({ page }) => {
      // Wait for products to load
      await page.waitForSelector('.ant-card, .product-card', {
        timeout: TIMEOUTS.medium,
      })

      // Check that at least one product is displayed
      const productCards = page.locator('.ant-card, .product-card')
      const count = await productCards.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should display categories for filtering', async ({ page }) => {
      // Check category buttons/filters are present
      const categories = page.locator(
        '.ant-segmented-item, .ant-tag, .category-btn'
      )
      const count = await categories.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Product Search', () => {
    test('should filter products when searching', async ({ page }) => {
      // Get initial product count
      const initialProducts = page.locator('.ant-card, .product-card')
      const initialCount = await initialProducts.count()

      // Type in search
      const searchInput = page.locator('input[placeholder*="Tim"]')
      await searchInput.fill('test')

      // Wait for search results
      await page.waitForTimeout(500) // Debounce wait

      // Products should be filtered (may be same or less)
      const filteredProducts = page.locator('.ant-card, .product-card')
      const filteredCount = await filteredProducts.count()

      // If there are matching products, count should be > 0
      // If no matches, might show empty state
      expect(filteredCount).toBeGreaterThanOrEqual(0)
      expect(filteredCount).toBeLessThanOrEqual(initialCount)
    })

    test('should clear search and show all products', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Tim"]')

      // Search first
      await searchInput.fill('xyz')
      await page.waitForTimeout(500)

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)

      // Products should reload
      const products = page.locator('.ant-card, .product-card')
      const count = await products.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Cart Operations', () => {
    test('should add product to cart', async ({ page }) => {
      // Click on first product card
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()

      // Wait for success message
      await expect(
        page.locator('.ant-message-success, .ant-message-notice-success')
      ).toBeVisible({ timeout: TIMEOUTS.short })

      // Check cart badge shows 1
      const cartBadge = page.locator('.ant-badge-count, .ant-float-btn .ant-badge')
      await expect(cartBadge).toBeVisible()
    })

    test('should open cart sheet when cart button is clicked', async ({ page }) => {
      // Add a product first
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()
      await page.waitForTimeout(300)

      // Click cart floating button
      await page.locator('.ant-float-btn').click()

      // Cart sheet should open
      await expect(page.locator('.ant-drawer, .cart-sheet')).toBeVisible()

      // Should show cart items
      await expect(page.locator('.ant-drawer-body, .cart-content')).toBeVisible()
    })

    test('should update cart quantity', async ({ page }) => {
      // Add a product
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()
      await page.waitForTimeout(300)

      // Open cart
      await page.locator('.ant-float-btn').click()
      await expect(page.locator('.ant-drawer, .cart-sheet')).toBeVisible()

      // Find increment button and click
      const incrementBtn = page.locator(
        '.ant-input-number-handler-up, button:has-text("+"), .quantity-increase'
      ).first()

      if (await incrementBtn.isVisible()) {
        await incrementBtn.click()
        await page.waitForTimeout(200)

        // Quantity should be 2
        await expect(page.locator('text=2').first()).toBeVisible()
      }
    })

    test('should remove item from cart', async ({ page }) => {
      // Add a product
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()
      await page.waitForTimeout(300)

      // Open cart
      await page.locator('.ant-float-btn').click()
      await expect(page.locator('.ant-drawer, .cart-sheet')).toBeVisible()

      // Find and click delete button
      const deleteBtn = page.locator(
        'button[aria-label*="delete"], .ant-btn-icon-only:has(.anticon-delete), button:has-text("Xoa")'
      ).first()

      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()

        // Cart should be empty or item removed
        await page.waitForTimeout(300)

        // Check for empty state or reduced item count
        const emptyText = page.locator('text=Gio hang trong, text=Chua co san pham')
        const cartItems = page.locator('.cart-item, .ant-list-item')

        const isEmpty = await emptyText.isVisible().catch(() => false)
        const hasItems = (await cartItems.count()) > 0

        // Either empty or item count reduced
        expect(isEmpty || !hasItems).toBeTruthy()
      }
    })
  })

  test.describe('Checkout Flow', () => {
    test('should proceed to payment step', async ({ page }) => {
      // Add a product
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()
      await page.waitForTimeout(300)

      // Open cart
      await page.locator('.ant-float-btn').click()
      await expect(page.locator('.ant-drawer, .cart-sheet')).toBeVisible()

      // Click checkout button
      const checkoutBtn = page.locator(
        'button:has-text("Thanh toan"), button:has-text("Checkout")'
      )
      await expect(checkoutBtn).toBeVisible()
      await checkoutBtn.click()

      // Should navigate to payment step
      await expect(page.locator('h1:has-text("Thanh toan")')).toBeVisible({
        timeout: TIMEOUTS.medium,
      })
    })

    test('should display payment methods', async ({ page }) => {
      // Add a product and go to payment
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()
      await page.waitForTimeout(300)

      await page.locator('.ant-float-btn').click()
      await page.locator('button:has-text("Thanh toan")').click()

      // Check payment methods are visible
      await expect(
        page.locator(`text=${PAYMENT_METHODS.cash}, text=Tiền mặt`)
      ).toBeVisible()
    })

    test('should complete checkout with cash payment', async ({ page }) => {
      // Add a product
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()
      await page.waitForTimeout(300)

      // Open cart and checkout
      await page.locator('.ant-float-btn').click()
      await page.locator('button:has-text("Thanh toan")').click()

      // Wait for payment page
      await expect(page.locator('h1:has-text("Thanh toan")')).toBeVisible()

      // Select cash payment (should be default or click to select)
      const cashOption = page.locator(
        'text=Tiền mặt, button:has-text("Tiền mặt"), .payment-cash'
      ).first()
      if (await cashOption.isVisible()) {
        await cashOption.click()
      }

      // Click confirm payment button
      const confirmBtn = page.locator(
        'button:has-text("Xac nhan"), button:has-text("Hoan tat"), button[type="submit"]'
      ).first()
      await confirmBtn.click()

      // Should show success page
      await expect(
        page.locator(
          'text=Thanh cong, text=Hoan tat, .checkout-success, .success-icon'
        ).first()
      ).toBeVisible({ timeout: TIMEOUTS.long })
    })

    test('should show new sale button after successful checkout', async ({ page }) => {
      // Complete a checkout first
      const productCard = page.locator('.ant-card, .product-card').first()
      await productCard.click()
      await page.waitForTimeout(300)

      await page.locator('.ant-float-btn').click()
      await page.locator('button:has-text("Thanh toan")').click()

      const confirmBtn = page.locator(
        'button:has-text("Xac nhan"), button:has-text("Hoan tat"), button[type="submit"]'
      ).first()
      await confirmBtn.click()

      // Wait for success
      await page.waitForTimeout(1000)

      // Check for new sale button
      const newSaleBtn = page.locator(
        'button:has-text("Ban hang moi"), button:has-text("Don moi")'
      )
      await expect(newSaleBtn.first()).toBeVisible({ timeout: TIMEOUTS.medium })
    })
  })

  test.describe('Category Filter', () => {
    test('should filter products by category', async ({ page }) => {
      // Get category buttons
      const categoryButtons = page.locator('.ant-segmented-item, .category-btn')
      const count = await categoryButtons.count()

      if (count > 1) {
        // Click second category (first might be "All")
        await categoryButtons.nth(1).click()
        await page.waitForTimeout(500)

        // Products should be filtered
        const products = page.locator('.ant-card, .product-card')
        // May have products or may show empty state
        await expect(products.first().or(page.locator('text=Khong co'))).toBeVisible()
      }
    })
  })
})
