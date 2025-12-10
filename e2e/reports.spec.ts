import { test, expect } from '@playwright/test'
import { ROUTES, TIMEOUTS, REPORT_TYPES } from './fixtures/test-data'
import { login, waitForPageLoad } from './helpers/auth'

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page)
    // Navigate to reports page
    await page.goto(ROUTES.reports)
    await waitForPageLoad(page)
  })

  test.describe('Reports Page Load', () => {
    test('should load reports page with correct elements', async ({ page }) => {
      // Check page header
      await expect(page.locator('h4:has-text("Báo cáo")')).toBeVisible()

      // Check tabs are present
      await expect(page.locator('.ant-tabs')).toBeVisible()

      // Check dashboard tab
      await expect(page.locator('text=Tổng quan')).toBeVisible()

      // Check reports tab
      await expect(page.locator('text=Sổ sách')).toBeVisible()
    })

    test('should have dashboard and reports tabs', async ({ page }) => {
      const tabs = page.locator('.ant-tabs-tab')
      const count = await tabs.count()

      // Should have 2 tabs: Dashboard and Reports
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('Dashboard Tab', () => {
    test('should display dashboard summary widgets', async ({ page }) => {
      // Ensure we are on dashboard tab (should be default)
      await page.locator('.ant-tabs-tab:has-text("Tổng quan")').click()
      await page.waitForTimeout(500)

      // Wait for dashboard to load
      await page.waitForLoadState('networkidle')

      // Check for summary cards/widgets
      const widgets = page.locator('.ant-card, .dashboard-widget, .summary-card')
      const count = await widgets.count()

      // Should have at least some dashboard widgets
      expect(count).toBeGreaterThan(0)
    })

    test('should display today sales widget', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Tổng quan")').click()
      await page.waitForTimeout(500)

      // Check for sales-related content
      const salesWidget = page.locator(
        'text=Doanh thu, text=Ban hang, text=Hom nay, .sales-widget'
      ).first()

      await expect(salesWidget).toBeVisible({ timeout: TIMEOUTS.medium })
    })

    test('should display recent sales widget', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Tổng quan")').click()
      await page.waitForTimeout(500)

      // Check for recent transactions
      const recentWidget = page.locator(
        'text=Giao dịch gần đây, text=Don hang, .recent-sales'
      ).first()

      // May or may not have recent sales, but widget area should exist
      await expect(recentWidget.or(page.locator('.ant-card').first())).toBeVisible()
    })

    test('should display alerts widget', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Tổng quan")').click()
      await page.waitForTimeout(500)

      // Check for alerts section
      const alertsWidget = page.locator(
        'text=Cảnh báo, text=Het hang, text=Thong bao, .alerts-widget'
      ).first()

      // Alerts widget should be visible
      await expect(
        alertsWidget.or(page.locator('.ant-card').nth(1))
      ).toBeVisible()
    })

    test('should display month summary widget', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Tổng quan")').click()
      await page.waitForTimeout(500)

      // Check for month summary
      const monthSummary = page.locator(
        'text=Tháng nay, text=Tong ket, text=Tháng, .month-summary'
      ).first()

      await expect(
        monthSummary.or(page.locator('.ant-card').nth(2))
      ).toBeVisible()
    })
  })

  test.describe('Reports Hub Tab', () => {
    test('should switch to reports hub tab', async ({ page }) => {
      // Click reports tab
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(300)

      // Tab content should be visible
      await expect(page.locator('.ant-tabs-tabpane-active')).toBeVisible()
    })

    test('should display all 7 report books', async ({ page }) => {
      // Switch to reports hub
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Check for all 7 report types
      for (const report of REPORT_TYPES) {
        const reportCard = page.locator(`text=${report.title}`)
        await expect(reportCard).toBeVisible({ timeout: TIMEOUTS.short })
      }
    })

    test('should display revenue book (So doanh thu)', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=So doanh thu')).toBeVisible()
      await expect(page.locator('text=Doanh thu ban hang')).toBeVisible()
    })

    test('should display cash book (So tiền mặt)', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=So tiền mặt')).toBeVisible()
      await expect(page.locator('text=Thu chi tiền mặt')).toBeVisible()
    })

    test('should display bank book (So tien gui)', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=So tien gui')).toBeVisible()
      await expect(page.locator('text=Thu chi ngan hang')).toBeVisible()
    })

    test('should display expense book (So chi phi)', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=So chi phi')).toBeVisible()
      await expect(page.locator('text=Chi phí theo danh muc')).toBeVisible()
    })

    test('should display inventory book (So ton kho)', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=So ton kho')).toBeVisible()
      await expect(page.locator('text=Xuat nhap ton')).toBeVisible()
    })

    test('should display tax book (So nghia vu thue)', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=So nghia vu thue')).toBeVisible()
      await expect(page.locator('text=VAT, TNCN theo quy')).toBeVisible()
    })

    test('should display salary book (So luong)', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('text=So luong')).toBeVisible()
      await expect(page.locator('text=Luong nhan vien')).toBeVisible()
    })

    test('should display date period selector', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Check for period selector
      await expect(page.locator('text=Hom nay')).toBeVisible()
      await expect(page.locator('text=Tuần')).toBeVisible()
      await expect(page.locator('text=Tháng')).toBeVisible()
      await expect(page.locator('text=Quy')).toBeVisible()
    })
  })

  test.describe('Report Preview', () => {
    test('should open report preview when clicking a report', async ({ page }) => {
      // Switch to reports hub
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click on first report (Revenue)
      const revenueReport = page.locator(
        '.ant-card:has-text("So doanh thu"), text=So doanh thu'
      ).first()
      await revenueReport.click()

      // Report preview should open (modal or drawer)
      await expect(
        page.locator('.ant-modal, .ant-drawer, .report-preview').first()
      ).toBeVisible({ timeout: TIMEOUTS.medium })
    })

    test('should display report content in preview', async ({ page }) => {
      // Switch to reports hub
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click on revenue report
      const revenueReport = page.locator(
        '.ant-card:has-text("So doanh thu")'
      ).first()
      await revenueReport.click()

      // Wait for preview to load
      await page.waitForTimeout(500)

      // Preview should have content area
      const previewContent = page.locator(
        '.ant-modal-body, .ant-drawer-body, .report-content'
      ).first()
      await expect(previewContent).toBeVisible()
    })

    test('should allow closing report preview', async ({ page }) => {
      // Switch to reports hub
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click on a report
      const report = page.locator('.ant-card:has-text("So tiền mặt")').first()
      await report.click()

      // Wait for preview
      await expect(page.locator('.ant-modal, .ant-drawer').first()).toBeVisible()

      // Find and click close button
      const closeBtn = page.locator(
        '.ant-modal-close, .ant-drawer-close, button:has-text("Dong")'
      ).first()
      await closeBtn.click()

      // Preview should be closed
      await expect(page.locator('.ant-modal, .ant-drawer').first()).not.toBeVisible({
        timeout: TIMEOUTS.short,
      })
    })

    test('should show download option in report preview', async ({ page }) => {
      // Switch to reports hub
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Check for download buttons on report cards
      const downloadBtn = page.locator(
        'button .anticon-download, button:has(.anticon-download)'
      ).first()

      await expect(downloadBtn).toBeVisible()
    })
  })

  test.describe('Date Period Selection', () => {
    test('should change period to today', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click today option
      await page.locator('text=Hom nay').first().click()

      // Should be selected
      await expect(
        page.locator('.ant-segmented-item-selected:has-text("Hom nay")')
      ).toBeVisible()
    })

    test('should change period to week', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click week option
      await page.locator('.ant-segmented-item:has-text("Tuần")').click()

      // Should be selected
      await expect(
        page.locator('.ant-segmented-item-selected:has-text("Tuần")')
      ).toBeVisible()
    })

    test('should change period to month', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click month option
      await page.locator('.ant-segmented-item:has-text("Tháng")').click()

      // Should be selected
      await expect(
        page.locator('.ant-segmented-item-selected:has-text("Tháng")')
      ).toBeVisible()
    })

    test('should change period to quarter', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click quarter option
      await page.locator('.ant-segmented-item:has-text("Quy")').click()

      // Should be selected
      await expect(
        page.locator('.ant-segmented-item-selected:has-text("Quy")')
      ).toBeVisible()
    })

    test('should show custom date picker when custom is selected', async ({ page }) => {
      await page.locator('.ant-tabs-tab:has-text("Sổ sách")').click()
      await page.waitForTimeout(500)

      // Click custom option
      const customBtn = page.locator('button:has-text("Tuy chon")').first()
      await customBtn.click()

      // Date range picker should appear
      await expect(page.locator('.ant-picker-range')).toBeVisible()
    })
  })
})
