# 🧾 PHASE 5: TAX COMPLIANCE
## Thời gian: 3 tuần (15 ngày làm việc)

---

## 🎯 MỤC TIÊU PHASE

- [ ] Tính VAT tự động (8% hoặc 10%)
- [ ] Tích hợp hóa đơn điện tử (E-Invoice)
- [ ] Tính thuế TNCN hộ kinh doanh
- [ ] Kê khai thuế theo quý
- [ ] Sổ nghĩa vụ thuế
- [ ] Sổ doanh thu

---

## 📋 QUY ĐỊNH THUẾ 2026

### Phân loại hộ kinh doanh

| Doanh thu/năm | VAT | TNCN | Hóa đơn điện tử |
|---------------|-----|------|-----------------|
| < 200 triệu | Miễn | Miễn | Không bắt buộc |
| 200tr - 1 tỷ | 8% (giảm) | 1.5% | Không bắt buộc |
| 1 tỷ - 3 tỷ | 8% (giảm) | 1.5% | **Bắt buộc** |
| > 3 tỷ | 10% | Như DN | Bắt buộc |

### Thuế suất

| Loại hình | VAT | TNCN |
|-----------|-----|------|
| Bán hàng (phân phối) | 8%/10% | 1% |
| Dịch vụ ăn uống | 8%/10% | 1.5% |
| Dịch vụ khác | 8%/10% | 2% |

---

## 📅 TUẦN 1: VAT CALCULATION

### Ngày 1-2: VAT Configuration

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.1.1 | Store tax settings page | 2h | Cấu hình thuế cửa hàng | Phase 4 |
| 5.1.2 | Business type selection | 1h | Bán hàng/Dịch vụ | 5.1.1 |
| 5.1.3 | Revenue tier detection | 2h | Tự động phân loại | 5.1.1 |
| 5.1.4 | Default VAT rate setting | 1h | 8% hoặc 10% | 5.1.1 |
| 5.1.5 | Product VAT rate override | 2h | VAT riêng cho SP | 5.1.4 |

**Tax Settings Schema:**
```typescript
interface TaxSettings {
  store_id: string
  business_type: 'retail' | 'food_service' | 'other_service'
  default_vat_rate: 8 | 10
  pit_rate: 1 | 1.5 | 2 // %
  e_invoice_required: boolean
  tax_declaration_period: 'monthly' | 'quarterly'
}
```

**Revenue Tier Detection:**
```typescript
// Function: tax/detect-revenue-tier
const detectRevenueTier = async (storeId: string) => {
  const lastYearRevenue = await getLastYearRevenue(storeId)
  
  if (lastYearRevenue < 200_000_000) return 'under_200m'
  if (lastYearRevenue < 1_000_000_000) return '200m_1b'
  if (lastYearRevenue < 3_000_000_000) return '1b_3b'
  return 'over_3b'
}
```

**Checklist:**
- [ ] Chọn loại hình kinh doanh
- [ ] Tự động detect revenue tier
- [ ] Hiển thị tax rates áp dụng
- [ ] Cảnh báo khi cần E-Invoice

---

### Ngày 3-4: VAT Calculation in POS

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.2.1 | Update cart VAT calculation | 2h | Dùng product VAT rate | 5.1.5 |
| 5.2.2 | VAT breakdown display | 1h | Show VAT per item | 5.2.1 |
| 5.2.3 | Total VAT summary | 1h | Sum all VAT | 5.2.2 |
| 5.2.4 | Handle mixed VAT rates | 2h | 8% và 10% cùng đơn | 5.2.3 |
| 5.2.5 | VAT invoice generation | 2h | Số liệu cho HĐ | 5.2.4 |

**VAT Calculation:**
```typescript
// For each sale item
const calculateItemVAT = (item: CartItem) => {
  const beforeVAT = item.quantity * item.unit_price
  const vatAmount = beforeVAT * (item.vat_rate / 100)
  const afterVAT = beforeVAT + vatAmount
  
  return { beforeVAT, vatAmount, afterVAT }
}

// Cart summary
const calculateCartVAT = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const vatAmount = items.reduce((sum, item) => sum + calculateItemVAT(item).vatAmount, 0)
  const total = subtotal + vatAmount
  
  return { subtotal, vatAmount, total }
}
```

**Checklist:**
- [ ] VAT tính đúng per item
- [ ] Mixed rates hiển thị đúng
- [ ] Total khớp với sum items

---

### Ngày 5: Revenue Book (Sổ Doanh Thu)

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.3.1 | Function: reports/revenue-book | 3h | Sổ doanh thu theo kỳ | 5.2.x |
| 5.3.2 | Revenue book page | 2h | Table với filter | 5.3.1 |
| 5.3.3 | Summary by VAT rate | 1h | Group by 8%/10% | 5.3.1 |
| 5.3.4 | Export Excel/PDF | 2h | Both formats | 5.3.2 |

**Revenue Book Format:**
```
SỔ DOANH THU
Kỳ: Quý 1/2026 (01/01 - 31/03/2026)

| Ngày | Số HĐ | Khách hàng | Diễn giải | DT chưa VAT | VAT | Tổng DT | Hình thức |
|------|-------|------------|-----------|-------------|-----|---------|-----------|
| 01/01| HD001 | Khách lẻ   | Bán hàng  | 500,000     |40,000| 540,000 | TM |
| 01/01| HD002 | Cty ABC    | Bán hàng  | 1,000,000   |80,000| 1,080,000| CK |
...

TỔNG HỢP:
├── Doanh thu chưa VAT: 150,000,000đ
├── VAT 8%: 10,000,000đ
├── VAT 10%: 2,000,000đ
├── Tổng VAT: 12,000,000đ
└── Tổng doanh thu: 162,000,000đ
```

**Checklist:**
- [ ] List tất cả đơn hoàn thành
- [ ] Phân biệt VAT 8% và 10%
- [ ] Tổng doanh thu đúng

---

## 📅 TUẦN 2: E-INVOICE INTEGRATION

### Ngày 6-7: E-Invoice Provider Setup

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.4.1 | Research MISA/Viettel API | 2h | API documentation | - |
| 5.4.2 | E-Invoice provider selection | 1h | UI to select provider | 5.4.1 |
| 5.4.3 | Provider credentials setup | 2h | Secure storage | 5.4.2 |
| 5.4.4 | Function: tax/e-invoice/test-connection | 2h | Verify credentials | 5.4.3 |
| 5.4.5 | E-Invoice settings page | 2h | Complete config | 5.4.4 |

**E-Invoice Providers:**
```typescript
interface EInvoiceProvider {
  code: 'misa' | 'viettel' | 'sapo' | 'vnpt'
  name: string
  apiUrl: string
  credentials: {
    username?: string
    password?: string
    apiKey?: string
    taxCode: string
    templateCode?: string
  }
}

const PROVIDERS = [
  { code: 'misa', name: 'MISA meInvoice', apiUrl: 'https://api.meinvoice.vn' },
  { code: 'viettel', name: 'Viettel S-Invoice', apiUrl: 'https://api.sinvoice.vn' },
  { code: 'vnpt', name: 'VNPT E-Invoice', apiUrl: 'https://api.vnpt-invoice.com.vn' },
]
```

**Checklist:**
- [ ] Chọn nhà cung cấp
- [ ] Nhập credentials
- [ ] Test connection thành công
- [ ] Secure storage (encrypted)

---

### Ngày 8-9: Create E-Invoice

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.5.1 | Function: tax/e-invoice/create | 4h | Call provider API | 5.4.x |
| 5.5.2 | Invoice data mapping | 2h | Map sale to invoice format | 5.5.1 |
| 5.5.3 | Handle API response | 2h | Parse & store result | 5.5.1 |
| 5.5.4 | E-Invoice UI in sale detail | 2h | View/Download HĐ | 5.5.3 |

**Create E-Invoice Flow:**
```typescript
// supabase/functions/tax/e-invoice/create/index.ts
interface CreateEInvoiceRequest {
  sale_id: string
  customer_name?: string
  customer_tax_code?: string
  customer_address?: string
}

// Flow:
// 1. Get sale with items
// 2. Get store E-Invoice config
// 3. Map to provider format
// 4. Call provider API
// 5. Store e_invoices record
// 6. Update sale.invoice_no

// MISA API example
const createMISAInvoice = async (data: InvoiceData) => {
  const response = await fetch('https://api.meinvoice.vn/api/v1/invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      InvoiceType: 1,
      InvoiceSymbol: '1C26TAA',
      CustomerName: data.customerName,
      CustomerTaxCode: data.customerTaxCode,
      CustomerAddress: data.customerAddress,
      Items: data.items.map(item => ({
        ItemName: item.productName,
        UnitName: item.unit,
        Quantity: item.quantity,
        UnitPrice: item.unitPrice,
        VATRate: item.vatRate,
        VATAmount: item.vatAmount,
        TotalAmount: item.total
      }))
    })
  })
  
  return response.json()
}
```

**Checklist:**
- [ ] Tạo HĐ điện tử thành công
- [ ] Lưu mã tra cứu CQT
- [ ] Download PDF/XML
- [ ] QR code để tra cứu

---

### Ngày 10: E-Invoice in POS Flow

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.6.1 | Auto-create E-Invoice option | 2h | Toggle trong checkout | 5.5.x |
| 5.6.2 | Customer info for E-Invoice | 2h | Bắt buộc nếu có MST | 5.6.1 |
| 5.6.3 | E-Invoice status display | 1h | Pending/Issued/Error | 5.6.2 |
| 5.6.4 | Retry failed E-Invoice | 2h | Manual retry | 5.6.3 |
| 5.6.5 | E-Invoice history page | 1h | List all invoices | 5.5.4 |

**Checkout với E-Invoice:**
```
┌─────────────────────────────┐
│ 🧾 Xuất hóa đơn điện tử     │
│ ┌─────────────────────────┐ │
│ │ ☑️ Xuất HĐ điện tử      │ │
│ └─────────────────────────┘ │
│                             │
│ Thông tin khách hàng:       │
│ ┌─────────────────────────┐ │
│ │ Tên: Công ty ABC        │ │
│ │ MST: 0123456789         │ │
│ │ Địa chỉ: 123 Lê Lợi... │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Checklist:**
- [ ] Optional E-Invoice toggle
- [ ] Bắt buộc info nếu có MST
- [ ] Hiển thị status sau tạo
- [ ] Retry nếu lỗi

---

## 📅 TUẦN 3: TAX DECLARATION

### Ngày 11-12: Quarterly Tax Calculation

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.7.1 | Function: tax/calculate-quarterly | 3h | Tính thuế theo quý | 5.3.x |
| 5.7.2 | VAT payable calculation | 2h | VAT ra - VAT vào | 5.7.1 |
| 5.7.3 | PIT calculation | 2h | TNCN = DT × rate | 5.7.1 |
| 5.7.4 | Tax summary dashboard | 2h | Current quarter | 5.7.3 |

**Quarterly Tax Calculation:**
```typescript
// supabase/functions/tax/calculate-quarterly/index.ts
interface QuarterlyTaxResult {
  period: string // Q1/2026
  periodStart: Date
  periodEnd: Date
  
  // VAT
  totalRevenue: number
  vatCollected: number      // VAT đầu ra (từ sales)
  vatDeductible: number     // VAT đầu vào (từ expenses với HĐ)
  vatPayable: number        // = vatCollected - vatDeductible
  
  // PIT (Personal Income Tax)
  pitBase: number           // = totalRevenue
  pitRate: number           // 1%, 1.5%, hoặc 2%
  pitPayable: number        // = pitBase × pitRate
  
  // Total
  totalTaxPayable: number   // = vatPayable + pitPayable
}

const calculateQuarterlyTax = async (storeId: string, quarter: number, year: number) => {
  // Get store settings
  const store = await getStore(storeId)
  
  // Calculate period
  const periodStart = new Date(year, (quarter - 1) * 3, 1)
  const periodEnd = new Date(year, quarter * 3, 0)
  
  // Get sales
  const sales = await getSales(storeId, periodStart, periodEnd)
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const vatCollected = sales.reduce((sum, s) => sum + s.vat_amount, 0)
  
  // Get deductible expenses
  const expenses = await getExpensesWithVAT(storeId, periodStart, periodEnd)
  const vatDeductible = expenses.reduce((sum, e) => sum + e.vat_amount, 0)
  
  // Calculate
  const vatPayable = Math.max(0, vatCollected - vatDeductible)
  const pitRate = store.pit_rate / 100
  const pitPayable = totalRevenue * pitRate
  
  return {
    period: `Q${quarter}/${year}`,
    totalRevenue,
    vatCollected,
    vatDeductible,
    vatPayable,
    pitRate: store.pit_rate,
    pitPayable,
    totalTaxPayable: vatPayable + pitPayable
  }
}
```

**Checklist:**
- [ ] Tính VAT đầu ra đúng
- [ ] Tính VAT đầu vào từ chi phí có HĐ
- [ ] Tính TNCN đúng rate
- [ ] Tổng thuế phải nộp

---

### Ngày 13: Tax Obligation Book

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.8.1 | Function: reports/tax-book | 3h | Sổ nghĩa vụ thuế | 5.7.x |
| 5.8.2 | Tax book page | 2h | Quarterly view | 5.8.1 |
| 5.8.3 | Declaration status | 1h | Draft/Declared/Paid | 5.8.2 |
| 5.8.4 | Export for declaration | 2h | Format cho kê khai | 5.8.2 |

**Tax Obligation Book Format:**
```
SỔ NGHĨA VỤ THUẾ
Năm: 2026

| Kỳ | Doanh thu | VAT đầu ra | VAT đầu vào | VAT nộp | TNCN | Tổng thuế | Trạng thái |
|----|-----------|------------|-------------|---------|------|-----------|------------|
| Q1 | 500,000,000| 40,000,000| 10,000,000| 30,000,000| 7,500,000| 37,500,000| Đã nộp ✅ |
| Q2 | 600,000,000| 48,000,000| 12,000,000| 36,000,000| 9,000,000| 45,000,000| Chưa kê khai ⏳|
| Q3 | -         | -          | -           | -       | -    | -         | Chưa đến kỳ |
| Q4 | -         | -          | -           | -       | -    | -         | Chưa đến kỳ |

TỔNG NĂM: 82,500,000đ (đã nộp: 37,500,000đ)
```

**Checklist:**
- [ ] Tổng hợp 4 quý
- [ ] Trạng thái từng kỳ
- [ ] Tổng thuế đã nộp
- [ ] Nhắc nhở deadline

---

### Ngày 14: Tax Reminders & Alerts

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.9.1 | Tax deadline calculation | 1h | Ngày 30 tháng cuối quý | 5.7.x |
| 5.9.2 | Tax reminder widget | 2h | Dashboard alert | 5.9.1 |
| 5.9.3 | Push notification | 2h | 7 ngày trước deadline | 5.9.1 |
| 5.9.4 | Declaration checklist | 2h | Các bước kê khai | 5.9.2 |

**Tax Deadline:**
```typescript
const getQuarterlyDeadline = (quarter: number, year: number) => {
  // Deadline: ngày cuối cùng của tháng đầu tiên quý sau
  // Q1 (Jan-Mar) -> deadline 30/04
  // Q2 (Apr-Jun) -> deadline 31/07
  // Q3 (Jul-Sep) -> deadline 31/10
  // Q4 (Oct-Dec) -> deadline 31/01 năm sau
  
  const deadlineMonth = quarter * 3 + 1
  const deadlineYear = quarter === 4 ? year + 1 : year
  
  return new Date(deadlineYear, deadlineMonth % 12, 0)
}
```

**Reminder Widget:**
```
┌─────────────────────────────┐
│ ⚠️ Sắp đến hạn kê khai     │
│                             │
│ Quý 2/2026                  │
│ Hạn nộp: 31/07/2026         │
│ Còn: 15 ngày                │
│                             │
│ Thuế ước tính: 45,000,000đ  │
│                             │
│ [Xem chi tiết →]            │
└─────────────────────────────┘
```

**Checklist:**
- [ ] Hiển thị deadline chính xác
- [ ] Đếm ngược ngày còn lại
- [ ] Push notification trước 7 ngày
- [ ] Highlight khi gần deadline

---

### Ngày 15: Testing & Integration

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 5.10.1 | Test VAT calculation | 1h | Accuracy check | 5.2.x |
| 5.10.2 | Test E-Invoice flow | 2h | End-to-end | 5.6.x |
| 5.10.3 | Test tax calculation | 2h | Quarterly accuracy | 5.7.x |
| 5.10.4 | Integration test | 1h | POS -> Tax flow | - |
| 5.10.5 | Bug fixes | 2h | Fix issues | - |

**Test Cases:**
- [ ] Sale with 8% VAT -> correct totals
- [ ] Sale with 10% VAT -> correct totals
- [ ] Mixed VAT rates in one sale
- [ ] E-Invoice creation and retrieval
- [ ] Quarterly tax = sum of daily sales
- [ ] VAT deductible from expenses

---

## 📊 TỔNG KẾT PHASE 5

### Deliverables

| Deliverable | Status |
|-------------|--------|
| VAT calculation (8%/10%) | ⬜ |
| E-Invoice integration | ⬜ |
| PIT calculation | ⬜ |
| Quarterly tax summary | ⬜ |
| Sổ doanh thu | ⬜ |
| Sổ nghĩa vụ thuế | ⬜ |
| Tax reminders | ⬜ |

### Edge Functions Created

| Function | Method | Description |
|----------|--------|-------------|
| tax/get-settings | POST | Cấu hình thuế |
| tax/update-settings | POST | Cập nhật cấu hình |
| tax/detect-revenue-tier | POST | Phân loại doanh thu |
| tax/e-invoice/test-connection | POST | Test provider |
| tax/e-invoice/create | POST | Tạo HĐ điện tử |
| tax/e-invoice/get | POST | Lấy HĐ điện tử |
| tax/e-invoice/cancel | POST | Hủy HĐ điện tử |
| tax/calculate-quarterly | POST | Tính thuế quý |
| reports/revenue-book | POST | Sổ doanh thu |
| reports/tax-book | POST | Sổ nghĩa vụ thuế |

### UI Components Created

```
components/tax/
├── TaxSettingsForm.tsx
├── VATBreakdown.tsx
├── EInvoiceToggle.tsx
├── EInvoiceCustomerForm.tsx
├── EInvoiceStatus.tsx
├── EInvoiceViewer.tsx
├── QuarterlyTaxSummary.tsx
├── TaxDeadlineWidget.tsx
├── TaxDeclarationChecklist.tsx
└── TaxBookTable.tsx
```

---

*Phase 5 Completion Target: 3 weeks*
