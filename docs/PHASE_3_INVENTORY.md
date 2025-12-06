# 📦 PHASE 3: INVENTORY MANAGEMENT
## Thời gian: 2 tuần (10 ngày làm việc)

---

## 🎯 MỤC TIÊU PHASE

- [ ] Nhập hàng từ nhà cung cấp
- [ ] Xuất hàng (không qua bán)
- [ ] Kiểm kê tồn kho
- [ ] Cảnh báo hết hàng
- [ ] Lịch sử xuất nhập kho
- [ ] Sổ theo dõi tồn kho

---

## 📅 TUẦN 1: IMPORT & EXPORT

### Ngày 1-2: Edge Functions cho Inventory

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.1.1 | Function: inventory/import-stock | 3h | Nhập hàng + log | Phase 2 |
| 3.1.2 | Function: inventory/export-stock | 2h | Xuất hàng + log | 3.1.1 |
| 3.1.3 | Function: inventory/adjust-stock | 2h | Điều chỉnh +/- | 3.1.1 |
| 3.1.4 | Function: inventory/get-logs | 2h | Pagination, filter | 3.1.1 |
| 3.1.5 | Function: inventory/get-summary | 2h | Tổng hợp tồn kho | 3.1.1 |

**Import Stock Function:**
```typescript
// supabase/functions/inventory/import-stock/index.ts
interface ImportStockRequest {
  product_id: string
  quantity: number
  unit_cost: number
  supplier_name?: string
  invoice_no?: string
  note?: string
}

// Flow:
// 1. Validate product exists
// 2. Update product quantity (add)
// 3. Create inventory_log (type: 'import')
// 4. Optionally create expense record
```

**Checklist:**
- [ ] Nhập hàng tăng stock
- [ ] Xuất hàng giảm stock
- [ ] Không cho xuất quá số lượng tồn
- [ ] Log mọi thay đổi

---

### Ngày 3: Import Stock UI

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.2.1 | Import stock page layout | 2h | Mobile-first | 3.1.x |
| 3.2.2 | Product selector | 2h | Search + barcode | 2.4.3 |
| 3.2.3 | Import form | 2h | Quantity, cost, supplier | 3.2.2 |
| 3.2.4 | Batch import (nhiều SP) | 2h | Add multiple items | 3.2.3 |

**Import Form Fields:**
```typescript
const importSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive('Số lượng > 0'),
  unit_cost: z.number().min(0, 'Giá nhập >= 0'),
  supplier_name: z.string().optional(),
  invoice_no: z.string().optional(),
  expense_date: z.date().optional(),
  note: z.string().optional(),
})
```

**Checklist:**
- [ ] Scan barcode -> select product
- [ ] Auto-calculate total value
- [ ] Batch import nhiều SP cùng lúc
- [ ] Success message với số lượng mới

---

### Ngày 4: Export Stock UI

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.3.1 | Export stock page | 2h | Similar to import | 3.2.x |
| 3.3.2 | Export reason selection | 1h | Hư hỏng, mất, cho | 3.3.1 |
| 3.3.3 | Export form | 2h | Quantity, reason | 3.3.2 |
| 3.3.4 | Stock validation | 1h | Cannot exceed current | 3.3.3 |

**Export Reasons:**
```typescript
const EXPORT_REASONS = [
  { value: 'damaged', label: 'Hư hỏng' },
  { value: 'lost', label: 'Mất mát' },
  { value: 'gift', label: 'Tặng/Cho' },
  { value: 'return_supplier', label: 'Trả nhà cung cấp' },
  { value: 'other', label: 'Khác' },
]
```

**Checklist:**
- [ ] Validate không xuất quá tồn
- [ ] Bắt buộc chọn lý do
- [ ] Note bổ sung nếu "Khác"

---

### Ngày 5: Inventory Logs & History

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.4.1 | Inventory history page | 2h | List all logs | 3.1.4 |
| 3.4.2 | Filter by product | 1h | Select product | 3.4.1 |
| 3.4.3 | Filter by type | 1h | Import/Export/Sale | 3.4.1 |
| 3.4.4 | Date range filter | 2h | From-To picker | 3.4.1 |
| 3.4.5 | Log detail bottom sheet | 1h | Full info display | 3.4.1 |

**Log Entry Display:**
```
┌─────────────────────────────┐
│ 📦 Mì gói Hảo Hảo          │
│ +50 cái                     │
│ Nhập hàng • 15/01/2026     │
│ NCC: ABC Trading            │
└─────────────────────────────┘
│ 🛒 Nước ngọt Coca          │
│ -5 chai                     │
│ Bán hàng • HD202601001     │
│ 14/01/2026 15:30           │
└─────────────────────────────┘
```

**Checklist:**
- [ ] Infinite scroll với pagination
- [ ] Pull to refresh
- [ ] Filter persist trong URL
- [ ] Export to Excel

---

## 📅 TUẦN 2: STOCK CHECK & ALERTS

### Ngày 6-7: Stock Check (Kiểm kê)

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.5.1 | Function: inventory/create-stock-check | 2h | Create check session | 3.1.x |
| 3.5.2 | Function: inventory/submit-stock-check | 3h | Process differences | 3.5.1 |
| 3.5.3 | Stock check page | 2h | List products to count | 3.5.1 |
| 3.5.4 | Count input per product | 2h | Actual quantity | 3.5.3 |
| 3.5.5 | Difference calculation | 1h | System vs Actual | 3.5.4 |
| 3.5.6 | Submit stock check | 2h | Confirm adjustments | 3.5.5 |

**Stock Check Table:**
```sql
CREATE TABLE stock_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id),
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    note TEXT
);

CREATE TABLE stock_check_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_check_id UUID REFERENCES stock_checks(id),
    product_id UUID REFERENCES products(id),
    system_quantity INTEGER,
    actual_quantity INTEGER,
    difference INTEGER,
    note TEXT
);
```

**Checklist:**
- [ ] Tạo phiên kiểm kê mới
- [ ] Nhập số lượng thực tế từng SP
- [ ] Hiển thị chênh lệch realtime
- [ ] Submit -> auto adjust stock
- [ ] Log các điều chỉnh

---

### Ngày 8: Low Stock Alerts

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.6.1 | Function: inventory/get-low-stock | 1h | Products < min_stock | 3.1.x |
| 3.6.2 | Low stock dashboard widget | 2h | Count + list | 3.6.1 |
| 3.6.3 | Low stock notification | 2h | Push notification | 3.6.1 |
| 3.6.4 | Low stock page | 2h | Full list + actions | 3.6.2 |

**Low Stock Widget:**
```
┌─────────────────────────────┐
│ ⚠️ Sắp hết hàng            │
│                             │
│ 5 sản phẩm cần nhập thêm   │
│                             │
│ • Mì gói (còn 3, min: 10)  │
│ • Nước suối (còn 5, min: 20)│
│                             │
│ [Xem tất cả →]              │
└─────────────────────────────┘
```

**Checklist:**
- [ ] Badge count trên dashboard
- [ ] Push notification (optional)
- [ ] Quick import từ alert
- [ ] Sort by urgency

---

### Ngày 9: Inventory Book Report

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.7.1 | Function: reports/inventory-book | 3h | Sổ theo dõi tồn kho | 3.1.x |
| 3.7.2 | Inventory book UI | 2h | Table với totals | 3.7.1 |
| 3.7.3 | Export to Excel | 1h | xlsx format | 3.7.2 |
| 3.7.4 | Export to PDF | 1h | Print-ready | 3.7.2 |

**Inventory Book Format:**
```
SỔ THEO DÕI TỒN KHO
Kỳ: 01/01/2026 - 31/01/2026

| STT | Mã SP | Tên SP | ĐVT | Tồn đầu | Nhập | Xuất | Tồn cuối | Đơn giá | Thành tiền |
|-----|-------|--------|-----|---------|------|------|----------|---------|------------|
| 1   | SP001 | Mì gói | Gói | 100     | 50   | 80   | 70       | 5,000   | 350,000    |
| 2   | SP002 | Nước   | Chai| 200     | 100  | 150  | 150      | 10,000  | 1,500,000  |
...
TỔNG CỘNG:                                                              1,850,000
```

**Checklist:**
- [ ] Tính tồn đầu kỳ đúng
- [ ] Tổng hợp nhập/xuất theo kỳ
- [ ] Tồn cuối = Tồn đầu + Nhập - Xuất
- [ ] Export đúng format

---

### Ngày 10: Testing & Integration

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 3.8.1 | Test import flow | 1h | E2E test | 3.2.x |
| 3.8.2 | Test export flow | 1h | E2E test | 3.3.x |
| 3.8.3 | Test stock check | 2h | E2E test | 3.5.x |
| 3.8.4 | Integration với POS | 2h | Sale updates stock | Phase 2 |
| 3.8.5 | Bug fixes | 2h | Fix issues | - |

**Checklist:**
- [ ] Import -> stock tăng -> log created
- [ ] Sale -> stock giảm -> log created
- [ ] Stock check -> adjustments correct
- [ ] Reports accurate

---

## 📊 TỔNG KẾT PHASE 3

### Deliverables

| Deliverable | Status |
|-------------|--------|
| Import stock functionality | ⬜ |
| Export stock functionality | ⬜ |
| Stock adjustment | ⬜ |
| Stock check (kiểm kê) | ⬜ |
| Inventory logs/history | ⬜ |
| Low stock alerts | ⬜ |
| Sổ theo dõi tồn kho | ⬜ |

### Edge Functions Created

| Function | Method | Description |
|----------|--------|-------------|
| inventory/import-stock | POST | Nhập hàng |
| inventory/export-stock | POST | Xuất hàng |
| inventory/adjust-stock | POST | Điều chỉnh |
| inventory/get-logs | POST | Lịch sử XNK |
| inventory/get-summary | POST | Tổng hợp tồn kho |
| inventory/get-low-stock | POST | SP sắp hết |
| inventory/create-stock-check | POST | Tạo phiên kiểm kê |
| inventory/submit-stock-check | POST | Hoàn tất kiểm kê |
| reports/inventory-book | POST | Sổ tồn kho |

### UI Components Created

```
components/inventory/
├── ImportStockForm.tsx
├── ExportStockForm.tsx
├── ProductSelector.tsx
├── InventoryLogList.tsx
├── InventoryLogItem.tsx
├── InventoryFilters.tsx
├── StockCheckList.tsx
├── StockCheckItem.tsx
├── LowStockWidget.tsx
├── LowStockList.tsx
└── InventoryBookTable.tsx
```

### Database Tables Added

```sql
-- stock_checks
-- stock_check_items
```

---

*Phase 3 Completion Target: 2 weeks*
