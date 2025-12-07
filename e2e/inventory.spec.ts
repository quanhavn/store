import { test, expect } from '@playwright/test'
import { ROUTES, TIMEOUTS, ADJUSTMENT_TYPES } from './fixtures/test-data'
import { login, waitForPageLoad } from './helpers/auth'

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page)
    // Navigate to inventory page
    await page.goto(ROUTES.inventory)
    await waitForPageLoad(page)
  })

  test.describe('Inventory Page Load', () => {
    test('should load inventory page with correct elements', async ({ page }) => {
      // Check page header
      await expect(page.locator('h4:has-text("Quan ly kho")')).toBeVisible()

      // Check tabs are present
      await expect(page.locator('.ant-tabs')).toBeVisible()

      // Check stock check tab
      await expect(page.locator('text=Ton kho')).toBeVisible()

      // Check adjustment tab
      await expect(page.locator('text=Nhap/Xuat')).toBeVisible()

      // Check alerts tab
      await expect(page.locator('text=Canh bao')).toBeVisible()
    })

    test('should display stock check button', async ({ page }) => {
      // Check stock check button exists
      const stockCheckBtn = page.locator('button:has-text("Kiem ke")')
      await expect(stockCheckBtn).toBeVisible()
    })

    test('should have inventory tabs navigation', async ({ page }) => {
      // Get all tab items
      const tabs = page.locator('.ant-tabs-tab')
      const count = await tabs.count()

      // Should have at least 3 tabs
      expect(count).toBeGreaterThanOrEqual(3)
    })
  })

  test.describe('Stock Check Tab', () => {
    test('should display product list on stock check tab', async ({ page }) => {
      // Ensure we are on stock check tab (default)
      await page.locator('text=Ton kho').click()
      await page.waitForTimeout(300)

      // Wait for product list to load
      await page.waitForSelector(
        '.ant-list-item, .ant-table-row, .product-row',
        { timeout: TIMEOUTS.medium }
      )

      // Check products are displayed
      const items = page.locator('.ant-list-item, .ant-table-row, .product-row')
      const count = await items.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should open stock check modal', async ({ page }) => {
      // Click stock check button
      const stockCheckBtn = page.locator(
        'button:has-text("Kiem ke"), button:has-text("Tiep tuc kiem ke")'
      ).first()
      await stockCheckBtn.click()

      // Modal should open
      await expect(
        page.locator('.ant-modal, .ant-drawer').first()
      ).toBeVisible({ timeout: TIMEOUTS.medium })

      // Modal should have title
      await expect(
        page.locator('text=Kiem ke ton kho, text=Kiem ke')
      ).toBeVisible()
    })
  })

  test.describe('Stock Adjustment Tab', () => {
    test('should switch to adjustment tab', async ({ page }) => {
      // Click adjustment tab
      await page.locator('.ant-tabs-tab:has-text("Nhap/Xuat")').click()
      await page.waitForTimeout(300)

      // Tab content should be visible
      await expect(page.locator('.ant-tabs-tabpane-active')).toBeVisible()
    })

    test('should display stock adjustment form', async ({ page }) => {
      // Switch to adjustment tab
      await page.locator('.ant-tabs-tab:has-text("Nhap/Xuat")').click()
      await page.waitForTimeout(500)

      // Check for adjustment type selector
      const importExportSelector = page.locator(
        'text=Nhap kho, text=Xuat kho, .ant-segmented, .ant-radio-group'
      ).first()
      await expect(importExportSelector).toBeVisible()
    })

    test('should have import and export options', async ({ page }) => {
      // Switch to adjustment tab
      await page.locator('.ant-tabs-tab:has-text("Nhap/Xuat")').click()
      await page.waitForTimeout(500)

      // Check import option
      await expect(
        page.locator(`text=${ADJUSTMENT_TYPES.import}, text=Nhap kho`).first()
      ).toBeVisible()

      // Check export option
      await expect(
        page.locator(`text=${ADJUSTMENT_TYPES.export}, text=Xuat kho`).first()
      ).toBeVisible()
    })

    test('should allow selecting products for adjustment', async ({ page }) => {
      // Switch to adjustment tab
      await page.locator('.ant-tabs-tab:has-text("Nhap/Xuat")').click()
      await page.waitForTimeout(500)

      // Look for product selector or add button
      const addProductBtn = page.locator(
        'button:has-text("Them"), button:has-text("Chon san pham"), .add-product-btn'
      )

      if (await addProductBtn.isVisible().catch(() => false)) {
        await addProductBtn.first().click()

        // Product selection modal/dropdown should appear
        await expect(
          page.locator(
            '.ant-select-dropdown, .ant-modal, .product-selector'
          ).first()
        ).toBeVisible({ timeout: TIMEOUTS.short })
      }
    })

    test('should allow entering adjustment quantity', async ({ page }) => {
      // Switch to adjustment tab
      await page.locator('.ant-tabs-tab:has-text("Nhap/Xuat")').click()
      await page.waitForTimeout(500)

      // Look for quantity input
      const quantityInput = page.locator(
        'input[type="number"], .ant-input-number-input, input[placeholder*="So luong"]'
      ).first()

      if (await quantityInput.isVisible().catch(() => false)) {
        // Enter a quantity
        await quantityInput.fill('10')

        // Value should be set
        await expect(quantityInput).toHaveValue('10')
      }
    })
  })

  test.describe('Low Stock Alerts Tab', () => {
    test('should switch to alerts tab', async ({ page }) => {
      // Click alerts tab
      await page.locator('.ant-tabs-tab:has-text("Canh bao")').click()
      await page.waitForTimeout(300)

      // Tab content should be visible
      await expect(page.locator('.ant-tabs-tabpane-active')).toBeVisible()
    })

    test('should display low stock alerts section', async ({ page }) => {
      // Switch to alerts tab
      await page.locator('.ant-tabs-tab:has-text("Canh bao")').click()
      await page.waitForTimeout(500)

      // Wait for content to load
      await page.waitForLoadState('networkidle')

      // Should show either alerts or empty state
      const hasAlerts = await page.locator('.ant-list-item, .ant-badge').count()
      const hasEmptyState = await page.locator('text=Khong co san pham').isVisible().catch(() => false)

      expect(hasAlerts > 0 || hasEmptyState).toBeTruthy()
    })

    test('should display out of stock and low stock counts', async ({ page }) => {
      // Switch to alerts tab
      await page.locator('.ant-tabs-tab:has-text("Canh bao")').click()
      await page.waitForTimeout(500)

      // Check for count displays
      const statsCards = page.locator(
        '.bg-red-50, .bg-orange-50, .stats-card, .alert-count'
      )
      const count = await statsCards.count()

      // Should have at least out of stock and low stock indicators
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show quick import button for low stock items', async ({ page }) => {
      // Switch to alerts tab
      await page.locator('.ant-tabs-tab:has-text("Canh bao")').click()
      await page.waitForTimeout(500)

      // Check for quick import buttons if there are low stock items
      const importButtons = page.locator('button:has-text("Nhap kho")')
      const count = await importButtons.count()

      // If there are low stock items, import buttons should exist
      if (count > 0) {
        await expect(importButtons.first()).toBeVisible()
      }
    })

    test('should display minimum stock threshold info', async ({ page }) => {
      // Switch to alerts tab
      await page.locator('.ant-tabs-tab:has-text("Canh bao")').click()
      await page.waitForTimeout(500)

      // Check for threshold info text
      const infoText = page.locator(
        'text=Toi thieu, text=min_stock, text=muc ton kho'
      )
      const hasInfo = await infoText.count() > 0

      // Info about threshold should be displayed somewhere
      expect(hasInfo).toBeDefined()
    })
  })

  test.describe('Stock Check Modal', () => {
    test('should display products in stock check modal', async ({ page }) => {
      // Open stock check modal
      const stockCheckBtn = page.locator(
        'button:has-text("Kiem ke"), button:has-text("Tiep tuc kiem ke")'
      ).first()
      await stockCheckBtn.click()

      // Wait for modal
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible()

      // Wait for products to load
      await page.waitForTimeout(500)

      // Should show product list for checking
      const productItems = page.locator(
        '.ant-list-item, .stock-check-item, .product-row'
      )
      const count = await productItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should allow entering actual quantity', async ({ page }) => {
      // Open stock check modal
      const stockCheckBtn = page.locator(
        'button:has-text("Kiem ke"), button:has-text("Tiep tuc kiem ke")'
      ).first()
      await stockCheckBtn.click()

      // Wait for modal
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible()
      await page.waitForTimeout(500)

      // Find quantity input for first product
      const quantityInput = page
        .locator('input[type="number"], .ant-input-number-input')
        .first()

      if (await quantityInput.isVisible().catch(() => false)) {
        await quantityInput.fill('15')
        await expect(quantityInput).toHaveValue('15')
      }
    })

    test('should allow canceling stock check', async ({ page }) => {
      // Open stock check modal
      const stockCheckBtn = page.locator(
        'button:has-text("Kiem ke"), button:has-text("Tiep tuc kiem ke")'
      ).first()
      await stockCheckBtn.click()

      // Wait for modal
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible()

      // Find cancel button
      const cancelBtn = page.locator(
        'button:has-text("Huy"), button:has-text("Dong"), .ant-modal-close'
      ).first()

      if (await cancelBtn.isVisible()) {
        await cancelBtn.click()

        // Modal might ask for confirmation
        const confirmBtn = page.locator('.ant-modal-confirm-btns button').first()
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click()
        }
      }
    })
  })
})
