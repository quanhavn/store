# MASTER PROJECT TRACKER
## Store Management PWA - Vietnam Tax 2026

---

## TONG QUAN DU AN

| Thong tin | Chi tiet |
|-----------|----------|
| **Ten du an** | Store Management PWA |
| **Muc tieu** | Quan ly cua hang nho, tuan thu thue VN 2026 |
| **Tech Stack** | Next.js 14, Supabase, TypeScript, Tailwind, Ant Design |
| **Thoi gian** | 20 tuan (~5 thang) |
| **Start Date** | 2024 |
| **Target Launch** | 2025 Q1 |

---

## TIEN DO TONG THE

```
Phase 1 ████████████████████ 100% [Setup - Complete]
Phase 2 ████████████████████ 100% [Core POS - Complete]
Phase 3 ████████████████████ 100% [Inventory - Complete]
Phase 4 ████████████████████ 100% [Finance - Complete]
Phase 5 ████████████████████ 100% [Tax - Complete]
Phase 6 ████████████████████ 100% [HR - Complete]
Phase 7 ████████████████████ 100% [Reports - Complete]
Phase 8 ██████████████████░░  90% [Launch - In Progress]
```

**Overall Progress: ~99%**

---

## TAI LIEU DU AN

| File | Mo ta | Status |
|------|-------|--------|
| [STORE_MANAGEMENT_PWA_SUPABASE.md](./STORE_MANAGEMENT_PWA_SUPABASE.md) | Ke hoach tong the | ✅ |
| [PHASE_1_SETUP.md](./PHASE_1_SETUP.md) | Chi tiet Phase 1 | ✅ |
| [PHASE_2_CORE_POS.md](./PHASE_2_CORE_POS.md) | Chi tiet Phase 2 | ✅ |
| [PHASE_3_INVENTORY.md](./PHASE_3_INVENTORY.md) | Chi tiet Phase 3 | ✅ |
| [PHASE_4_FINANCE.md](./PHASE_4_FINANCE.md) | Chi tiet Phase 4 | ✅ |
| [PHASE_5_TAX.md](./PHASE_5_TAX.md) | Chi tiet Phase 5 | ✅ |
| [PHASE_6_HR.md](./PHASE_6_HR.md) | Chi tiet Phase 6 | ✅ |
| [PHASE_7_REPORTS.md](./PHASE_7_REPORTS.md) | Chi tiet Phase 7 | ✅ |
| [PHASE_8_LAUNCH.md](./PHASE_8_LAUNCH.md) | Chi tiet Phase 8 | ✅ |
| [USER_GUIDE.md](./USER_GUIDE.md) | Huong dan su dung | ✅ |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Huong dan quan tri | ✅ |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Tai lieu API | ✅ |
| [FAQ.md](./FAQ.md) | Cau hoi thuong gap | ✅ |

---

## TIMELINE

| Phase | Tuần | Status |
|-------|------|--------|
| **Phase 1: Setup** | 1-2 | ✅ Complete |
| **Phase 2: Core POS** | 3-6 | ✅ Complete |
| **Phase 3: Inventory** | 7-8 | ✅ Complete |
| **Phase 4: Finance** | 9-11 | ✅ Complete |
| **Phase 5: Tax** | 12-14 | ✅ Complete |
| **Phase 6: HR** | 15-16 | ✅ Complete |
| **Phase 7: Reports** | 17-18 | ✅ Complete |
| **Phase 8: Launch** | 19-20 | 🔄 In Progress |

---

## PHASE DETAILS

### Phase 1: Setup (2 tuan)
**Muc tieu:** Khoi tao du an, database, auth (Phone/Password)

| Tasks | Status |
|-------|--------|
| Project initialization, Tailwind, UI components | ✅ |
| Supabase client setup, auth middleware | ✅ |
| Phone/Password authentication UI | ✅ |
| Database schema - core tables | ✅ |
| Database schema - supporting tables | ✅ |
| Row Level Security policies | ✅ |
| Edge Functions boilerplate | ✅ |
| Client API layer, React Query | ✅ |
| PWA configuration | ✅ |
| CI/CD, documentation | ✅ |

---

### Phase 2: Core POS (4 tuan)
**Muc tieu:** Ban hang, gio hang, thanh toan

| Tasks | Status |
|-------|--------|
| Product CRUD Edge Functions | ✅ |
| Product List UI (ProductGrid) | ✅ |
| Product Form UI (ProductForm) | ✅ |
| POS Layout | ✅ |
| Barcode Scanner (BarcodeScanner) | ✅ |
| Cart Management (CartSheet, useCartStore) | ✅ |
| Customer Info | ✅ |
| Payment Methods (PaymentMethods component) | ✅ |
| Create Sale Function (pos/index.ts) | ✅ |
| Checkout Flow (CheckoutSuccess) | ✅ |
| Receipt Printing (ReceiptTemplate, PrintButton) | ✅ |
| Offline Support (IndexedDB, sync) | ✅ |
| Testing & Polish | ✅ |

---

### Phase 3: Inventory (2 tuan)
**Muc tieu:** Nhap/xuat kho, kiem ke

| Tasks | Status |
|-------|--------|
| Inventory Edge Functions (inventory/index.ts) | ✅ |
| Import Stock (StockAdjustment) | ✅ |
| Export Stock | ✅ |
| Inventory Logs | ✅ |
| Stock Check (StockCheckForm, StockCheckList, StockCheckSummary) | ✅ |
| Low Stock Alerts (LowStockAlerts) | ✅ |
| Inventory Book | ✅ |
| Testing & Integration | ✅ |

---

### Phase 4: Finance (3 tuan)
**Muc tieu:** Tiền mặt, ngan hang, chi phi

| Tasks | Status |
|-------|--------|
| Cash Functions (finance/index.ts) | ✅ |
| Cash Dashboard UI (CashBalanceCard) | ✅ |
| Cash Forms (CashInForm, CashOutForm) | ✅ |
| Cash Book Report | ✅ |
| Bank Account Setup (BankAccountList, BankAccountForm) | ✅ |
| Bank Transactions | ✅ |
| Bank Book Report | ✅ |
| Expense Functions | ✅ |
| Expense UI (ExpenseList, ExpenseForm) | ✅ |
| Expense Book Report | ✅ |
| Finance Summary (FinanceSummaryCard) | ✅ |
| Amount Keypad (AmountKeypad) | ✅ |
| Integration & Testing | ✅ |

---

### Phase 5: Tax (3 tuan)
**Muc tieu:** VAT, E-Invoice, ke khai thue

| Tasks | Status |
|-------|--------|
| VAT Configuration (tax/index.ts) | ✅ |
| VAT in POS | ✅ |
| Revenue Book | ✅ |
| Tax Settings UI (TaxSettingsForm) | ✅ |
| Quarterly Tax Summary (QuarterlyTaxSummary) | ✅ |
| Tax Deadline Widget (TaxDeadlineWidget) | ✅ |
| Tax Obligation Book | ✅ |
| Tax Reminders | ✅ |
| E-Invoice Provider Setup (Viettel SINVOICE) | ✅ |
| E-Invoice Creation | ✅ |
| Testing & Integration | ✅ |

---

### Phase 6: HR (2 tuan)
**Muc tieu:** Nhân viên, cham cong, luong

| Tasks | Status |
|-------|--------|
| Employee Functions (hr/index.ts) | ✅ |
| Employee UI (EmployeeList, EmployeeCard, EmployeeForm, EmployeeDetail) | ✅ |
| Attendance (AttendanceCalendar, CheckInOutButton) | ✅ |
| Salary Calculation (with insurance & PIT) | ✅ |
| Payroll UI (PayrollDashboard, PayslipList, PayslipDetail) | ✅ |
| Salary Book | ✅ |
| Integration & Testing | ✅ |

---

### Phase 7: Reports (2 tuan)
**Muc tieu:** Dashboard, 7 so sach, export

| Tasks | Status |
|-------|--------|
| Dashboard Overview (DashboardSummary) | ✅ |
| Dashboard Content (dashboard-content.tsx) | ✅ |
| Sales Analytics | ✅ |
| Financial Analytics | ✅ |
| Reports Hub (ReportsHub) | ✅ |
| Report Preview (ReportPreview) | ✅ |
| Charts (SalesLineChart, RevenueExpenseChart, CategoryPieChart, PaymentMethodsPieChart) | ✅ |
| Today Sales Widget (TodaySalesWidget) | ✅ |
| Recent Sales Widget (RecentSalesWidget) | ✅ |
| Export Excel/PDF | ✅ |
| Report Templates (PDF for 7 books) | ✅ |
| Testing & Polish | ✅ |

---

### Phase 8: Launch (2 tuan)
**Muc tieu:** Testing, deployment, go-live

| Tasks | Status |
|-------|--------|
| UAT Testing (E2E with Playwright) | ✅ |
| Performance Optimization | ✅ |
| Security Audit | ✅ |
| Bug Fixes | 🔄 Ongoing |
| Documentation | ✅ |
| Production Setup | ✅ |
| Monitoring & Analytics (GoogleAnalytics, Sentry) | ✅ |
| Go-Live | ⬜ Pending |

---

## 7 SO SACH KE TOAN

| # | Ten so | Phase | Function | Status |
|---|--------|-------|----------|--------|
| 1 | So doanh thu | 5 | reports/revenue_book | ✅ |
| 2 | So tiền mặt | 4 | reports/cash_book | ✅ |
| 3 | So tien gui | 4 | reports/bank_book | ✅ |
| 4 | So chi phi | 4 | reports/expense_book | ✅ |
| 5 | So ton kho | 3 | reports/inventory_book | ✅ |
| 6 | So nghia vu thue | 5 | reports/tax_book | ✅ |
| 7 | So luong | 6 | reports/salary_book | ✅ |

---

## EDGE FUNCTIONS CHECKLIST

### Phase 1
- [x] health-check
- [x] get-user-store

### Phase 2
- [x] products (list, get, create, update, delete)
- [x] categories (list, create, update, delete)
- [x] pos (create, get, list)

### Phase 3
- [x] inventory/import
- [x] inventory/export
- [x] inventory/adjust
- [x] inventory/logs
- [x] inventory/summary
- [x] inventory/low_stock
- [x] inventory/create_stock_check
- [x] inventory/get_stock_check
- [x] inventory/update_stock_check_item
- [x] inventory/submit_stock_check
- [x] inventory/get_active_stock_check
- [x] inventory/cancel_stock_check

### Phase 4
- [x] finance/cash_balance
- [x] finance/cash_in
- [x] finance/cash_out
- [x] finance/cash_transactions
- [x] finance/bank_accounts (list, create)
- [x] finance/expenses (create, list)
- [x] finance/summary

### Phase 5
- [x] tax/get_settings
- [x] tax/update_settings
- [x] tax/quarterly_summary
- [x] tax/deadlines
- [x] tax/e-invoice (Viettel SINVOICE)

### Phase 6
- [x] hr/list_employees
- [x] hr/create_employee
- [x] hr/update_employee
- [x] hr/deactivate_employee
- [x] hr/get_employee
- [x] hr/list_positions
- [x] hr/check_in
- [x] hr/check_out
- [x] hr/get_attendance
- [x] hr/attendance_summary
- [x] hr/calculate_salary
- [x] hr/calculate_all_salaries
- [x] hr/approve_payroll
- [x] hr/mark_paid
- [x] hr/get_payroll
- [x] hr/salary_book

### Phase 7
- [x] reports/dashboard_summary
- [x] reports/sales_analytics
- [x] reports/financial_analytics
- [x] reports/revenue_book
- [x] reports/cash_book
- [x] reports/bank_book
- [x] reports/expense_book
- [x] reports/inventory_book
- [x] reports/tax_book
- [x] reports/salary_book

---

## COMPONENTS IMPLEMENTED

### UI Components
- [x] OfflineIndicator
- [x] Mobile Layout (mobile-layout.tsx)

### Products
- [x] ProductGrid
- [x] ProductSearch
- [x] ProductCard
- [x] CategoryFilter
- [x] ProductForm

### POS
- [x] BarcodeScanner
- [x] PaymentMethods
- [x] CartSheet
- [x] CheckoutSuccess

### Receipt
- [x] ReceiptTemplate
- [x] PrintButton

### Inventory
- [x] LowStockAlerts
- [x] StockCheckForm
- [x] StockCheckList
- [x] StockAdjustment
- [x] StockCheckSummary

### Finance
- [x] BankAccountList
- [x] BankAccountForm
- [x] ExpenseList
- [x] ExpenseForm
- [x] CashBalanceCard
- [x] CashTransactionList
- [x] CashInForm
- [x] CashOutForm
- [x] FinanceSummaryCard
- [x] AmountKeypad

### Tax
- [x] TaxDeadlineWidget
- [x] TaxSettingsForm
- [x] QuarterlyTaxSummary

### HR
- [x] EmployeeList
- [x] EmployeeCard
- [x] EmployeeForm
- [x] EmployeeDetail
- [x] PayrollDashboard
- [x] PayslipList
- [x] PayslipDetail
- [x] AttendanceCalendar
- [x] CheckInOutButton

### Invoice
- [x] CreateInvoiceSheet
- [x] InvoiceDetail
- [x] InvoiceActions
- [x] InvoiceList

### Reports
- [x] DashboardSummary
- [x] ReportsHub
- [x] ReportPreview
- [x] TodaySalesWidget
- [x] RecentSalesWidget
- [x] SalesLineChart
- [x] RevenueExpenseChart
- [x] CategoryPieChart
- [x] PaymentMethodsPieChart

### Analytics
- [x] GoogleAnalytics

### Dashboard
- [x] dashboard-content.tsx

### Providers
- [x] antd-provider.tsx
- [x] query-provider.tsx

---

## PAGES IMPLEMENTED

| Page | Path | Status |
|------|------|--------|
| Login | /login | ✅ |
| Dashboard | / | ✅ |
| POS | /pos | ✅ |
| Products | /products | ✅ |
| Inventory | /inventory | ✅ |
| Finance | /finance | ✅ |
| Tax | /tax | ✅ |
| HR | /hr | ✅ |
| Reports | /reports | ✅ |
| Settings | /settings | ✅ |

---

## PENDING ITEMS

### High Priority
- [x] E-Invoice provider integration (Viettel SINVOICE implemented)
- [x] Excel/PDF export functionality
- [ ] Production deployment & Go-Live

### Medium Priority
- [ ] SMS OTP for password reset
- [ ] Push notifications for low stock alerts
- [ ] Multi-store support

### Low Priority
- [ ] Dark mode theme
- [ ] Additional report templates
- [ ] Batch import/export products

---

## NOTES & DECISIONS

### Decisions Made
- E-Invoice provider: Viettel SINVOICE (implemented)
- SMS OTP provider: To be determined
- Hosting: Vercel + Supabase
- UI Framework: Ant Design + Tailwind CSS
- State Management: Zustand + TanStack Query
- Offline Storage: IndexedDB (Dexie.js)

### Known Issues
- Vietnamese font in PDF export uses normalized text (full Unicode font can be embedded for better display)

### Risks Mitigated
- ✅ Offline sync implemented with queue system
- ✅ RLS policies implemented for data security
- ✅ Error tracking with Sentry
- ✅ E-Invoice integration with Viettel SINVOICE
- ✅ Excel/PDF export for all 7 accounting books

---

## CONTACTS

| Role | Name | Contact |
|------|------|---------|
| Project Owner | ___________ | ___________ |
| Tech Lead | ___________ | ___________ |
| Designer | ___________ | ___________ |
| QA | ___________ | ___________ |

---

*Last Updated: December 8, 2024*
