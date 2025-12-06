# 💰 PHASE 4: FINANCE MANAGEMENT
## Thời gian: 3 tuần (15 ngày làm việc)

---

## 🎯 MỤC TIÊU PHASE

- [ ] Quản lý quỹ tiền mặt
- [ ] Quản lý tài khoản ngân hàng
- [ ] Ghi nhận thu/chi
- [ ] Quản lý chi phí theo danh mục
- [ ] Sổ tiền mặt
- [ ] Sổ tiền gửi ngân hàng
- [ ] Sổ chi phí

---

## 📅 TUẦN 1: CASH MANAGEMENT

### Ngày 1: Edge Functions cho Cash

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.1.1 | Function: finance/get-cash-balance | 1h | Current balance | Phase 3 |
| 4.1.2 | Function: finance/cash-in | 2h | Thu tiền mặt | 4.1.1 |
| 4.1.3 | Function: finance/cash-out | 2h | Chi tiền mặt | 4.1.1 |
| 4.1.4 | Function: finance/get-cash-transactions | 2h | List with filter | 4.1.1 |

**Cash Transaction Logic:**
```typescript
// supabase/functions/finance/cash-in/index.ts
interface CashInRequest {
  amount: number
  description: string
  reference_type?: 'sale' | 'adjustment' | 'other'
  reference_id?: string
}

// Flow:
// 1. Get last cash_book entry to get current balance
// 2. Calculate new balance = old + amount
// 3. Insert new cash_book entry
// 4. Return new balance
```

**Checklist:**
- [ ] Balance luôn chính xác
- [ ] Không cho chi quá số dư (optional)
- [ ] Log mọi giao dịch

---

### Ngày 2: Cash Dashboard UI

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.2.1 | Cash balance card | 2h | Current balance display | 4.1.1 |
| 4.2.2 | Today's transactions widget | 2h | Summary thu/chi hôm nay | 4.1.4 |
| 4.2.3 | Quick cash-in button | 1h | FAB action | 4.2.1 |
| 4.2.4 | Quick cash-out button | 1h | FAB action | 4.2.1 |
| 4.2.5 | Cash transaction list | 2h | Recent transactions | 4.1.4 |

**Cash Dashboard:**
```
┌─────────────────────────────┐
│ 💵 Quỹ tiền mặt            │
│                             │
│     12,500,000đ             │
│                             │
│ Hôm nay:                    │
│ ↑ Thu: 3,500,000đ           │
│ ↓ Chi: 1,200,000đ           │
└─────────────────────────────┘

[+ Thu tiền]  [- Chi tiền]

Giao dịch gần đây:
├── +350,000đ - Bán hàng HD001
├── -150,000đ - Mua hàng
└── +200,000đ - Bán hàng HD002
```

**Checklist:**
- [ ] Real-time balance update
- [ ] Pull to refresh
- [ ] Transaction grouped by date

---

### Ngày 3: Cash In/Out Forms

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.3.1 | Cash-in form sheet | 2h | Bottom sheet form | 4.2.3 |
| 4.3.2 | Cash-out form sheet | 2h | Bottom sheet form | 4.2.4 |
| 4.3.3 | Amount input keypad | 2h | Custom number pad | 4.3.1 |
| 4.3.4 | Quick amount buttons | 1h | 100k, 200k, 500k, 1M | 4.3.3 |

**Cash Form:**
```typescript
const cashSchema = z.object({
  amount: z.number().positive('Số tiền > 0'),
  description: z.string().min(1, 'Mô tả bắt buộc'),
  reference_type: z.enum(['sale', 'expense', 'adjustment', 'other']).optional(),
})
```

**Checklist:**
- [ ] Number keypad mobile-friendly
- [ ] Quick amount chips
- [ ] Validation before submit
- [ ] Success animation

---

### Ngày 4-5: Cash Book Report

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.4.1 | Function: reports/cash-book | 3h | Sổ tiền mặt theo kỳ | 4.1.x |
| 4.4.2 | Cash book page | 2h | Table với running balance | 4.4.1 |
| 4.4.3 | Date range picker | 1h | From-To selection | 4.4.2 |
| 4.4.4 | Opening/Closing balance | 2h | Tồn đầu/cuối kỳ | 4.4.1 |
| 4.4.5 | Export Excel | 1h | xlsx format | 4.4.2 |
| 4.4.6 | Export PDF | 1h | Print-ready | 4.4.2 |

**Cash Book Format:**
```
SỔ TIỀN MẶT
Kỳ: 01/01/2026 - 31/01/2026
Tồn đầu kỳ: 5,000,000đ

| Ngày | Số CT | Diễn giải | Thu (Nợ) | Chi (Có) | Tồn quỹ |
|------|-------|-----------|----------|----------|---------|
| 01/01| PT001 | Bán hàng  | 500,000  |          | 5,500,000|
| 02/01| PC001 | Mua hàng  |          | 300,000  | 5,200,000|
| 03/01| PT002 | Bán hàng  | 800,000  |          | 6,000,000|
...
Tổng cộng:            | 5,000,000| 2,500,000|
Tồn cuối kỳ: 7,500,000đ
```

**Checklist:**
- [ ] Tồn đầu kỳ đúng
- [ ] Running balance mỗi dòng
- [ ] Tổng thu/chi đúng
- [ ] Tồn cuối = Tồn đầu + Thu - Chi

---

## 📅 TUẦN 2: BANK ACCOUNT MANAGEMENT

### Ngày 6: Bank Account Setup

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.5.1 | Function: finance/bank-accounts/list | 1h | List all accounts | 4.1.x |
| 4.5.2 | Function: finance/bank-accounts/create | 2h | Add new account | 4.5.1 |
| 4.5.3 | Function: finance/bank-accounts/update | 1h | Edit account | 4.5.1 |
| 4.5.4 | Bank accounts page | 2h | List + manage | 4.5.1 |
| 4.5.5 | Add bank account form | 2h | Bank info form | 4.5.2 |

**Bank Account Form:**
```typescript
const bankAccountSchema = z.object({
  bank_name: z.string().min(1),
  account_number: z.string().min(6).max(20),
  account_name: z.string().min(1),
  branch: z.string().optional(),
  is_default: z.boolean().default(false),
  initial_balance: z.number().default(0),
})

const VIETNAM_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'VPB', name: 'VPBank' },
  // ... more banks
]
```

**Checklist:**
- [ ] Chọn ngân hàng từ list
- [ ] Validate số tài khoản
- [ ] Một TK mặc định
- [ ] Hiển thị số dư từng TK

---

### Ngày 7: Bank Transactions

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.6.1 | Function: finance/bank-in | 2h | Nhận tiền vào TK | 4.5.x |
| 4.6.2 | Function: finance/bank-out | 2h | Chi từ TK | 4.5.x |
| 4.6.3 | Function: finance/bank-transfer | 2h | Chuyển giữa TK | 4.5.x |
| 4.6.4 | Bank transaction forms | 2h | In/Out/Transfer | 4.6.x |

**Bank Transaction Flow:**
```typescript
// Nhận tiền vào TK
// 1. Update bank_accounts balance
// 2. Create bank_book entry

// Chuyển tiền giữa TK
// 1. Check source balance
// 2. Decrease source, increase target
// 3. Create 2 bank_book entries (out + in)
```

**Checklist:**
- [ ] Balance update realtime
- [ ] Transfer between accounts
- [ ] Bank reference (mã GD ngân hàng)

---

### Ngày 8-9: Bank Book Report

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.7.1 | Function: reports/bank-book | 3h | Sổ tiền gửi theo TK | 4.6.x |
| 4.7.2 | Bank book page | 2h | Select account + table | 4.7.1 |
| 4.7.3 | Account selector | 1h | Dropdown các TK | 4.7.2 |
| 4.7.4 | Combined bank book | 2h | Tất cả TK | 4.7.1 |
| 4.7.5 | Export Excel/PDF | 2h | Both formats | 4.7.2 |

**Bank Book Format:**
```
SỔ TIỀN GỬI NGÂN HÀNG
Tài khoản: 1234567890 - Vietcombank
Kỳ: 01/01/2026 - 31/01/2026
Tồn đầu kỳ: 10,000,000đ

| Ngày | Số GD | Diễn giải | Ghi nợ | Ghi có | Số dư |
|------|-------|-----------|--------|--------|-------|
| 05/01| GD001 | Nhận TT   | 2,000,000|       | 12,000,000|
| 10/01| GD002 | Thanh toán|        | 500,000| 11,500,000|
...
Tồn cuối kỳ: 15,000,000đ
```

**Checklist:**
- [ ] Sổ theo từng TK
- [ ] Sổ tổng hợp tất cả TK
- [ ] Bank reference hiển thị

---

## 📅 TUẦN 3: EXPENSE MANAGEMENT

### Ngày 10-11: Expense Functions

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.8.1 | Function: finance/expense-categories/list | 1h | Danh mục chi phí | 4.6.x |
| 4.8.2 | Function: finance/expense-categories/create | 1h | Thêm danh mục | 4.8.1 |
| 4.8.3 | Function: finance/expenses/create | 3h | Ghi nhận chi phí | 4.8.1 |
| 4.8.4 | Function: finance/expenses/list | 2h | List với filter | 4.8.3 |
| 4.8.5 | Function: finance/expenses/get-summary | 2h | Tổng hợp theo DM | 4.8.4 |

**Default Expense Categories:**
```typescript
const DEFAULT_EXPENSE_CATEGORIES = [
  { code: 'GOODS', name: 'Mua hàng hóa', is_deductible: true },
  { code: 'RENT', name: 'Thuê mặt bằng', is_deductible: true },
  { code: 'UTILITIES', name: 'Điện nước', is_deductible: true },
  { code: 'SALARY', name: 'Lương nhân viên', is_deductible: true },
  { code: 'TRANSPORT', name: 'Vận chuyển', is_deductible: true },
  { code: 'MARKETING', name: 'Quảng cáo', is_deductible: true },
  { code: 'INSURANCE', name: 'Bảo hiểm', is_deductible: true },
  { code: 'REPAIR', name: 'Sửa chữa', is_deductible: true },
  { code: 'OTHER', name: 'Chi phí khác', is_deductible: false },
]
```

**Checklist:**
- [ ] Chi phí có VAT được khấu trừ
- [ ] Link với hóa đơn mua hàng
- [ ] Auto record to cash/bank book

---

### Ngày 12: Expense UI

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.9.1 | Expense list page | 2h | Filter by date, category | 4.8.4 |
| 4.9.2 | Add expense form | 3h | Full expense form | 4.8.3 |
| 4.9.3 | Category management page | 1h | CRUD categories | 4.8.2 |
| 4.9.4 | Expense summary widget | 2h | Chart by category | 4.8.5 |

**Expense Form:**
```typescript
const expenseSchema = z.object({
  category_id: z.string().uuid(),
  description: z.string().min(1),
  amount: z.number().positive(),
  vat_amount: z.number().min(0).default(0),
  payment_method: z.enum(['cash', 'bank_transfer']),
  bank_account_id: z.string().uuid().optional(),
  invoice_no: z.string().optional(),
  supplier_name: z.string().optional(),
  supplier_tax_code: z.string().optional(),
  expense_date: z.date(),
})
```

**Checklist:**
- [ ] Chọn danh mục chi phí
- [ ] Nhập VAT đầu vào (khấu trừ)
- [ ] Chọn TT tiền mặt hoặc CK
- [ ] Attach ảnh hóa đơn (optional)

---

### Ngày 13-14: Expense Book Report

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.10.1 | Function: reports/expense-book | 3h | Sổ chi phí theo kỳ | 4.8.x |
| 4.10.2 | Expense book page | 2h | Table với totals | 4.10.1 |
| 4.10.3 | Filter by category | 1h | Lọc theo danh mục | 4.10.2 |
| 4.10.4 | Summary by category | 2h | Pie chart | 4.10.1 |
| 4.10.5 | Export Excel/PDF | 2h | Both formats | 4.10.2 |

**Expense Book Format:**
```
SỔ CHI PHÍ
Kỳ: 01/01/2026 - 31/01/2026

| Ngày | Số CT | Loại chi phí | Diễn giải | Số tiền | VAT | Tổng | Hình thức |
|------|-------|--------------|-----------|---------|-----|------|-----------|
| 05/01| CP001 | Mua hàng     | NCC ABC   | 5,000,000| 400,000| 5,400,000| CK |
| 10/01| CP002 | Điện nước    | T1/2026   | 800,000| 80,000| 880,000| TM |
...
TỔNG CỘNG:                              | 10,000,000| 800,000| 10,800,000|

Tổng hợp theo danh mục:
├── Mua hàng hóa: 5,400,000đ (50%)
├── Thuê mặt bằng: 3,000,000đ (28%)
├── Điện nước: 880,000đ (8%)
└── Khác: 1,520,000đ (14%)
```

**Checklist:**
- [ ] Tổng hợp theo danh mục
- [ ] Tổng VAT đầu vào
- [ ] Chart visualization
- [ ] Filter by date range

---

### Ngày 15: Integration & Testing

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 4.11.1 | Link POS sale to cash/bank book | 2h | Auto-record | Phase 2 |
| 4.11.2 | Link inventory import to expense | 2h | Auto-expense | Phase 3 |
| 4.11.3 | Test cash flow | 1h | End-to-end | 4.3.x |
| 4.11.4 | Test bank flow | 1h | End-to-end | 4.6.x |
| 4.11.5 | Test expense flow | 1h | End-to-end | 4.9.x |
| 4.11.6 | Bug fixes | 1h | Fix issues | - |

**Checklist:**
- [ ] Sale tiền mặt -> cash book
- [ ] Sale chuyển khoản -> bank book
- [ ] Import hàng -> expense + cash/bank
- [ ] Reports số liệu khớp

---

## 📊 TỔNG KẾT PHASE 4

### Deliverables

| Deliverable | Status |
|-------------|--------|
| Cash management | ⬜ |
| Bank account management | ⬜ |
| Expense management | ⬜ |
| Sổ tiền mặt | ⬜ |
| Sổ tiền gửi ngân hàng | ⬜ |
| Sổ chi phí | ⬜ |

### Edge Functions Created

| Function | Method | Description |
|----------|--------|-------------|
| finance/get-cash-balance | POST | Số dư tiền mặt |
| finance/cash-in | POST | Thu tiền mặt |
| finance/cash-out | POST | Chi tiền mặt |
| finance/get-cash-transactions | POST | List giao dịch TM |
| finance/bank-accounts/list | POST | List tài khoản NH |
| finance/bank-accounts/create | POST | Thêm TK ngân hàng |
| finance/bank-in | POST | Nhận tiền vào TK |
| finance/bank-out | POST | Chi từ TK |
| finance/bank-transfer | POST | Chuyển tiền |
| finance/expense-categories/list | POST | Danh mục chi phí |
| finance/expenses/create | POST | Ghi nhận chi phí |
| finance/expenses/list | POST | List chi phí |
| reports/cash-book | POST | Sổ tiền mặt |
| reports/bank-book | POST | Sổ tiền gửi |
| reports/expense-book | POST | Sổ chi phí |

### UI Components Created

```
components/finance/
├── CashBalanceCard.tsx
├── CashTransactionList.tsx
├── CashInForm.tsx
├── CashOutForm.tsx
├── AmountKeypad.tsx
├── BankAccountList.tsx
├── BankAccountForm.tsx
├── BankTransactionForm.tsx
├── ExpenseList.tsx
├── ExpenseForm.tsx
├── ExpenseCategoryPicker.tsx
├── ExpenseSummaryChart.tsx
└── FinanceReportTable.tsx
```

---

*Phase 4 Completion Target: 3 weeks*
