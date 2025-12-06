# 🛒 PHASE 2: CORE POS
## Thời gian: 4 tuần (20 ngày làm việc)

---

## 🎯 MỤC TIÊU PHASE

- [ ] Quản lý sản phẩm (CRUD)
- [ ] Quản lý danh mục
- [ ] Giao diện bán hàng mobile-first
- [ ] Giỏ hàng với offline support
- [ ] Thanh toán (tiền mặt, chuyển khoản)
- [ ] In hóa đơn (thermal printer)
- [ ] Barcode scanning

---

## 📅 TUẦN 1: PRODUCT MANAGEMENT

### Ngày 1-2: Edge Functions cho Products

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.1.1 | Function: products/list | 2h | Pagination, search, filter | 1.7.x |
| 2.1.2 | Function: products/get | 1h | Get single product | 2.1.1 |
| 2.1.3 | Function: products/create | 2h | Validate input, insert | 2.1.1 |
| 2.1.4 | Function: products/update | 2h | Partial update support | 2.1.1 |
| 2.1.5 | Function: products/delete | 1h | Soft delete (active=false) | 2.1.1 |
| 2.1.6 | Function: categories/list | 1h | Tree structure support | 1.7.x |
| 2.1.7 | Function: categories/create | 1h | With parent_id | 2.1.6 |

**Edge Function Example:**
```typescript
// supabase/functions/products/list/index.ts
interface ListProductsRequest {
  page?: number
  limit?: number
  search?: string
  category_id?: string
  low_stock?: boolean
}
```

**Checklist:**
- [ ] Tất cả CRUD functions hoạt động
- [ ] Pagination đúng
- [ ] Search by name, SKU, barcode
- [ ] Filter by category
- [ ] Low stock filter

---

### Ngày 3-4: Product List UI (Mobile-First)

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.2.1 | Mobile layout cho Products page | 2h | Bottom sheet, FAB | 1.9.x |
| 2.2.2 | Product card component | 2h | Image, name, price, stock | - |
| 2.2.3 | Product grid/list view toggle | 1h | Grid 2 cols mobile | 2.2.2 |
| 2.2.4 | Search bar with debounce | 2h | 300ms debounce | 2.2.1 |
| 2.2.5 | Category filter chips | 2h | Horizontal scroll | 2.1.6 |
| 2.2.6 | Pull to refresh | 1h | TanStack Query refetch | 2.2.3 |
| 2.2.7 | Infinite scroll | 2h | Load more on scroll | 2.2.3 |

**Components:**
```
components/products/
├── ProductCard.tsx
├── ProductGrid.tsx
├── ProductSearch.tsx
├── CategoryFilter.tsx
└── ProductListHeader.tsx
```

**Checklist:**
- [ ] Responsive: 2 cols mobile, 3-4 cols tablet/desktop
- [ ] Image lazy loading
- [ ] Skeleton loading state
- [ ] Empty state khi không có product

---

### Ngày 5: Product Form UI

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.3.1 | Product form schema (Zod) | 1h | Validation rules | - |
| 2.3.2 | Add product sheet/modal | 3h | Bottom sheet mobile | 2.2.x |
| 2.3.3 | Edit product sheet | 2h | Pre-fill data | 2.3.2 |
| 2.3.4 | Image upload to Supabase Storage | 2h | Compress before upload | 2.3.2 |

**Form Fields:**
```typescript
const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm bắt buộc'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  cost_price: z.number().min(0),
  sell_price: z.number().min(0),
  vat_rate: z.number().default(8),
  quantity: z.number().int().min(0),
  min_stock: z.number().int().min(0).default(10),
  unit: z.string().default('cái'),
})
```

**Checklist:**
- [ ] Form validation hiển thị lỗi
- [ ] Image preview trước upload
- [ ] Loading state khi submit
- [ ] Success toast sau create/update

---

## 📅 TUẦN 2: POS INTERFACE

### Ngày 6-7: POS Layout & Product Selection

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.4.1 | POS page layout | 2h | Header + Grid + Cart button | 2.2.x |
| 2.4.2 | Quick search input | 1h | Auto-focus, search icon | 2.2.4 |
| 2.4.3 | Barcode scanner component | 3h | Camera API, quagga2 | 2.4.1 |
| 2.4.4 | Product selection grid | 2h | Tap to add to cart | 2.2.3 |
| 2.4.5 | Category quick filter | 1h | Pills horizontal scroll | 2.2.5 |
| 2.4.6 | Recent products section | 2h | Last 10 sold items | 2.4.4 |

**Barcode Scanner:**
```typescript
// components/pos/BarcodeScanner.tsx
import Quagga from '@ericblade/quagga2'

// Hoặc sử dụng html5-qrcode
import { Html5Qrcode } from 'html5-qrcode'
```

**Checklist:**
- [ ] Tap product -> add to cart với quantity 1
- [ ] Long press -> show quick actions
- [ ] Barcode scan -> find product -> add to cart
- [ ] Sound/haptic feedback on add

---

### Ngày 8-9: Cart Management

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.5.1 | Cart Zustand store | 2h | Add, remove, update qty | - |
| 2.5.2 | Cart bottom sheet | 3h | Slide up from button | 2.5.1 |
| 2.5.3 | Cart item component | 2h | Qty +/-, remove, price | 2.5.2 |
| 2.5.4 | Cart summary | 1h | Subtotal, VAT, Total | 2.5.3 |
| 2.5.5 | Apply discount | 2h | % or fixed amount | 2.5.4 |
| 2.5.6 | Clear cart confirmation | 1h | Dialog confirm | 2.5.2 |
| 2.5.7 | Cart persistence (localStorage) | 1h | Persist across refresh | 2.5.1 |

**Cart Store:**
```typescript
// lib/stores/cart.ts
interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount: number
}

interface CartStore {
  items: CartItem[]
  discount: number
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  setDiscount: (amount: number) => void
  clear: () => void
  subtotal: number
  vatAmount: number
  total: number
}
```

**Checklist:**
- [ ] Swipe left to remove item
- [ ] Quantity stepper (-/+)
- [ ] Real-time total calculation
- [ ] Discount % hoặc số tiền
- [ ] Cart badge on FAB

---

### Ngày 10: Customer Info & Notes

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.6.1 | Customer info section | 2h | Name, phone, tax code | 2.5.x |
| 2.6.2 | Customer search/autocomplete | 2h | Search existing customers | 2.6.1 |
| 2.6.3 | Order notes input | 1h | Textarea with char limit | 2.5.x |
| 2.6.4 | Save customer for next time | 1h | Checkbox to save | 2.6.2 |

**Checklist:**
- [ ] Có thể bỏ qua customer info
- [ ] Tax code validation (10 hoặc 13 số)
- [ ] Autocomplete từ customers table

---

## 📅 TUẦN 3: PAYMENT & CHECKOUT

### Ngày 11-12: Payment Methods

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.7.1 | Payment method selection UI | 2h | Cash, Bank, MoMo, ZaloPay | 2.5.x |
| 2.7.2 | Cash payment flow | 2h | Amount received, change | 2.7.1 |
| 2.7.3 | Bank transfer flow | 2h | Select bank, ref number | 2.7.1 |
| 2.7.4 | Split payment support | 3h | Multiple methods | 2.7.2, 2.7.3 |
| 2.7.5 | QR code generation for bank | 2h | VietQR format | 2.7.3 |

**Payment UI:**
```
Chọn phương thức thanh toán:
┌─────────────────────────────┐
│ 💵 Tiền mặt                 │
├─────────────────────────────┤
│ 🏦 Chuyển khoản             │
├─────────────────────────────┤
│ 📱 MoMo                     │
├─────────────────────────────┤
│ 📱 ZaloPay                  │
└─────────────────────────────┘
```

**VietQR Generation:**
```typescript
// VietQR format for bank transfer
const generateVietQR = (bank: string, accountNo: string, amount: number, description: string) => {
  return `https://img.vietqr.io/image/${bank}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(description)}`
}
```

**Checklist:**
- [ ] Tiền mặt: hiển thị tiền thối
- [ ] Chuyển khoản: QR code hiển thị
- [ ] Split: tổng = cart total
- [ ] Keyboard number pad for cash

---

### Ngày 13-14: Create Sale Edge Function

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.8.1 | Function: pos/create-sale | 4h | Full transaction | 2.1.x |
| 2.8.2 | Generate invoice number | 1h | Format: HD{YYYYMM}{SEQ} | 2.8.1 |
| 2.8.3 | Update product quantities | 2h | Decrease stock | 2.8.1 |
| 2.8.4 | Create inventory logs | 1h | Type: 'sale' | 2.8.3 |
| 2.8.5 | Record to cash/bank book | 2h | Auto-entry | 2.8.1 |
| 2.8.6 | Function: pos/get-sale | 1h | With items, payments | 2.8.1 |

**Transaction Flow:**
```
1. Validate cart items
2. Check stock availability
3. Create sale record
4. Create sale_items
5. Create payments
6. Update product quantities
7. Create inventory_logs
8. Record to cash_book or bank_book
9. Return sale with invoice_no
```

**Checklist:**
- [ ] All-or-nothing transaction
- [ ] Stock check before sale
- [ ] Proper error messages
- [ ] Invoice number unique

---

### Ngày 15: Checkout Flow & Success

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.9.1 | Checkout confirmation screen | 2h | Summary before submit | 2.8.x |
| 2.9.2 | Loading state during checkout | 1h | Disable buttons | 2.9.1 |
| 2.9.3 | Success screen | 2h | Invoice no, amount | 2.9.1 |
| 2.9.4 | Print/Share options | 2h | Print receipt, share | 2.9.3 |
| 2.9.5 | New sale button | 1h | Clear cart, go to POS | 2.9.3 |

**Success Screen:**
```
┌─────────────────────────────┐
│         ✅ Thành công        │
│                             │
│     Số hóa đơn: HD202601001 │
│     Tổng tiền: 350,000đ     │
│                             │
│   [🖨️ In hóa đơn]           │
│   [📤 Chia sẻ]              │
│                             │
│   [➕ Đơn hàng mới]          │
└─────────────────────────────┘
```

**Checklist:**
- [ ] Animation success
- [ ] Haptic feedback
- [ ] Auto-clear cart
- [ ] Deep link to sale detail

---

## 📅 TUẦN 4: RECEIPT & OFFLINE

### Ngày 16-17: Receipt Printing

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.10.1 | Receipt HTML template | 2h | 58mm/80mm width | 2.9.x |
| 2.10.2 | Web Print API integration | 2h | window.print() | 2.10.1 |
| 2.10.3 | Bluetooth printer support | 4h | ESC/POS commands | 2.10.1 |
| 2.10.4 | Receipt preview | 1h | Before print | 2.10.1 |
| 2.10.5 | Print settings | 2h | Printer selection | 2.10.3 |

**Receipt Template:**
```
================================
       TÊN CỬA HÀNG
    Địa chỉ: 123 ABC...
    SĐT: 0901234567
================================
Số HĐ: HD202601001
Ngày: 15/01/2026 14:30
Nhân viên: Nguyễn Văn A
--------------------------------
Sản phẩm        SL    Thành tiền
--------------------------------
Mì gói Hảo Hảo   5      25,000đ
Nước ngọt        2      20,000đ
--------------------------------
Tạm tính:              45,000đ
VAT (8%):               3,600đ
--------------------------------
TỔNG CỘNG:             48,600đ
================================
Tiền mặt:              50,000đ
Tiền thối:              1,400đ
================================
    Cảm ơn quý khách!
================================
```

**Checklist:**
- [ ] Print trên browser
- [ ] Print qua Bluetooth thermal
- [ ] QR code on receipt (optional)
- [ ] Store logo on receipt

---

### Ngày 18-19: Offline Support

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.11.1 | IndexedDB schema cho cart | 2h | Dexie setup | - |
| 2.11.2 | Cache products locally | 2h | Sync on app load | 2.11.1 |
| 2.11.3 | Offline sale creation | 3h | Queue for sync | 2.11.2 |
| 2.11.4 | Sync queue management | 2h | Retry logic | 2.11.3 |
| 2.11.5 | Offline indicator UI | 1h | Banner khi offline | 2.11.1 |
| 2.11.6 | Sync status UI | 2h | Pending sales count | 2.11.4 |

**Offline DB Schema:**
```typescript
// lib/offline/db.ts
class OfflineDB extends Dexie {
  products!: Table<Product>
  pendingSales!: Table<PendingSale>
  syncQueue!: Table<SyncQueueItem>
  
  constructor() {
    super('StoreManagementDB')
    this.version(1).stores({
      products: 'id, barcode, sku, name, category_id',
      pendingSales: 'id, created_at, synced',
      syncQueue: 'id, action, status, created_at'
    })
  }
}
```

**Checklist:**
- [ ] Bán hàng được khi mất mạng
- [ ] Sync tự động khi có mạng
- [ ] Hiển thị số đơn pending
- [ ] Conflict resolution

---

### Ngày 20: Testing & Polish

| Task ID | Task | Giờ | Acceptance Criteria | Depends On |
|---------|------|-----|---------------------|------------|
| 2.12.1 | E2E test: add product | 1h | Playwright test | 2.3.x |
| 2.12.2 | E2E test: complete sale | 2h | Full flow test | 2.9.x |
| 2.12.3 | Performance optimization | 2h | Lighthouse > 80 | - |
| 2.12.4 | Bug fixes từ testing | 2h | Fix critical bugs | - |
| 2.12.5 | Code review & refactor | 1h | Clean code | - |

**Checklist:**
- [ ] All E2E tests pass
- [ ] No TypeScript errors
- [ ] Lighthouse Performance > 80
- [ ] Mobile UX smooth

---

## 📊 TỔNG KẾT PHASE 2

### Deliverables

| Deliverable | Status |
|-------------|--------|
| Product CRUD (UI + Functions) | ⬜ |
| Category management | ⬜ |
| POS interface (mobile-first) | ⬜ |
| Barcode scanning | ⬜ |
| Cart management | ⬜ |
| Payment processing | ⬜ |
| Receipt printing | ⬜ |
| Offline support | ⬜ |

### Edge Functions Created

| Function | Method | Description |
|----------|--------|-------------|
| products/list | POST | List with pagination, search |
| products/get | POST | Get single product |
| products/create | POST | Create product |
| products/update | POST | Update product |
| products/delete | POST | Soft delete |
| categories/list | POST | List categories |
| categories/create | POST | Create category |
| pos/create-sale | POST | Create sale transaction |
| pos/get-sale | POST | Get sale details |

### UI Components Created

```
components/
├── products/
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── ProductForm.tsx
│   ├── ProductSearch.tsx
│   └── CategoryFilter.tsx
├── pos/
│   ├── POSLayout.tsx
│   ├── BarcodeScanner.tsx
│   ├── CartSheet.tsx
│   ├── CartItem.tsx
│   ├── CartSummary.tsx
│   ├── PaymentMethods.tsx
│   ├── CashPayment.tsx
│   ├── BankPayment.tsx
│   └── CheckoutSuccess.tsx
└── receipt/
    ├── ReceiptTemplate.tsx
    └── PrintButton.tsx
```

---

*Phase 2 Completion Target: 4 weeks*
