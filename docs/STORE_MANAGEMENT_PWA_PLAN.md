# 📱 KẾ HOẠCH TRIỂN KHAI PWA QUẢN LÝ CỬA HÀNG
## Tuân thủ quy định thuế mới Việt Nam 2026

---

## 📋 TỔNG QUAN

### Bối cảnh quy định thuế 2026

Theo **Nghị quyết 68-NQ/TW** và các văn bản pháp luật mới:

| Mức doanh thu/năm | Yêu cầu bắt buộc |
|-------------------|------------------|
| < 200 triệu VND | Miễn thuế, không cần hóa đơn điện tử |
| 200 triệu - 1 tỷ VND | Kê khai theo quý, sổ sách kế toán cơ bản |
| 1 - 3 tỷ VND | Bắt buộc hóa đơn điện tử có mã CQT |
| > 3 tỷ VND | Kế toán như doanh nghiệp nhỏ |

**Thay đổi quan trọng:**
- ❌ Bỏ thuế khoán từ 01/01/2026
- ✅ Tự kê khai, tự nộp thuế
- ✅ VAT giảm còn 8% đến hết 2026 (theo NQ 204/2025/QH15)
- ✅ Hóa đơn điện tử theo Nghị định 70/2025/NĐ-CP

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Tech Stack đề xuất

| Layer | Công nghệ | Lý do chọn |
|-------|-----------|------------|
| **Frontend** | Next.js 14 + TypeScript | SSR, PWA support, App Router |
| **UI Library** | Tailwind CSS + shadcn/ui | Responsive, customizable |
| **State** | Zustand + TanStack Query | Lightweight, caching |
| **Backend** | Node.js + Fastify | Performance, TypeScript |
| **Database** | PostgreSQL + Prisma | Reliable, typed ORM |
| **Cache** | Redis | Session, real-time data |
| **Mobile** | PWA + Capacitor (option) | Cross-platform |

### Tính năng PWA
- ✅ Offline-first với Service Worker
- ✅ IndexedDB cho cache local
- ✅ Push notifications
- ✅ Install trên home screen
- ✅ Camera API cho scan barcode

---

## 🗄️ DATABASE SCHEMA

### Core Tables

```sql
-- Cửa hàng
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(20) UNIQUE, -- Mã số thuế
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    revenue_tier ENUM('under_200m', '200m_1b', '1b_3b', 'over_3b'),
    e_invoice_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sản phẩm
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    sku VARCHAR(50),
    barcode VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(20), -- cái, kg, hộp...
    cost_price DECIMAL(15,2),
    sell_price DECIMAL(15,2),
    vat_rate DECIMAL(4,2) DEFAULT 8.00, -- 8% hoặc 10%
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    category_id UUID,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Đơn hàng
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    user_id UUID REFERENCES users(id),
    invoice_no VARCHAR(50),
    subtotal DECIMAL(15,2),
    vat_amount DECIMAL(15,2),
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2),
    status ENUM('pending', 'completed', 'cancelled', 'refunded'),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chi tiết đơn hàng
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER,
    unit_price DECIMAL(15,2),
    vat_rate DECIMAL(4,2),
    vat_amount DECIMAL(15,2),
    total DECIMAL(15,2)
);

-- Thanh toán
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    method ENUM('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay'),
    amount DECIMAL(15,2),
    bank_account_id UUID,
    bank_ref VARCHAR(100),
    paid_at TIMESTAMP DEFAULT NOW()
);

-- Sổ tiền mặt
CREATE TABLE cash_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    transaction_date DATE,
    description TEXT,
    reference_type ENUM('sale', 'expense', 'adjustment'),
    reference_id UUID,
    debit DECIMAL(15,2) DEFAULT 0, -- Thu
    credit DECIMAL(15,2) DEFAULT 0, -- Chi
    balance DECIMAL(15,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sổ tiền gửi ngân hàng
CREATE TABLE bank_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    transaction_date DATE,
    description TEXT,
    reference_type ENUM('sale', 'expense', 'transfer'),
    reference_id UUID,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2),
    bank_ref VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chi phí
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    category_id UUID REFERENCES expense_categories(id),
    description TEXT,
    amount DECIMAL(15,2),
    vat_amount DECIMAL(15,2) DEFAULT 0,
    payment_method ENUM('cash', 'bank_transfer'),
    bank_account_id UUID,
    invoice_no VARCHAR(50),
    expense_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nhập xuất kho
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    product_id UUID REFERENCES products(id),
    type ENUM('import', 'export', 'sale', 'return', 'adjustment'),
    quantity INTEGER,
    unit_cost DECIMAL(15,2),
    total_value DECIMAL(15,2),
    reference_type VARCHAR(50),
    reference_id UUID,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Nhân viên & Lương
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    name VARCHAR(255),
    phone VARCHAR(20),
    id_card VARCHAR(20),
    position VARCHAR(100),
    base_salary DECIMAL(15,2),
    hire_date DATE,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    period_month INTEGER,
    period_year INTEGER,
    working_days INTEGER,
    base_salary DECIMAL(15,2),
    allowances DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    insurance DECIMAL(15,2) DEFAULT 0, -- BHXH, BHYT
    pit DECIMAL(15,2) DEFAULT 0, -- Thuế TNCN
    net_salary DECIMAL(15,2),
    paid_date DATE,
    payment_method ENUM('cash', 'bank_transfer'),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Hóa đơn điện tử
CREATE TABLE e_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    invoice_symbol VARCHAR(20), -- Ký hiệu hóa đơn
    invoice_no VARCHAR(20), -- Số hóa đơn
    issue_date TIMESTAMP,
    provider ENUM('misa', 'viettel', 'sapo', 'vnpt'),
    provider_invoice_id VARCHAR(100),
    tax_authority_code VARCHAR(50), -- Mã CQT
    qr_code TEXT,
    xml_content TEXT,
    status ENUM('pending', 'issued', 'cancelled'),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sổ nghĩa vụ thuế
CREATE TABLE tax_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    period_type ENUM('monthly', 'quarterly'),
    period_start DATE,
    period_end DATE,
    total_revenue DECIMAL(15,2),
    vat_collected DECIMAL(15,2), -- VAT đầu ra
    vat_deductible DECIMAL(15,2), -- VAT đầu vào
    vat_payable DECIMAL(15,2), -- VAT phải nộp
    pit_base DECIMAL(15,2), -- Thu nhập tính thuế TNCN
    pit_rate DECIMAL(4,2), -- 1.5% hoặc 2%
    pit_payable DECIMAL(15,2), -- TNCN phải nộp
    total_tax DECIMAL(15,2),
    status ENUM('draft', 'declared', 'paid'),
    declared_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📦 MODULES VÀ TÍNH NĂNG

### Module 1: POS - Bán hàng

| Tính năng | Mô tả |
|-----------|-------|
| Quét barcode/QR | Camera API, quét mã sản phẩm |
| Tìm kiếm sản phẩm | Tên, mã, danh mục |
| Giỏ hàng | Thêm, sửa, xóa sản phẩm |
| Chiết khấu | Theo đơn hoặc từng sản phẩm |
| Thanh toán đa kênh | Tiền mặt, chuyển khoản, ví điện tử |
| In hóa đơn | Máy in nhiệt 58mm/80mm |
| Hóa đơn điện tử | Tích hợp MISA, Viettel, Sapo |
| Trả hàng/Hoàn tiền | Xử lý đổi trả |

### Module 2: Kho - Tồn kho

| Tính năng | Mô tả |
|-----------|-------|
| Nhập hàng | Từ NCC, scan barcode |
| Xuất hàng | Theo đơn bán, điều chuyển |
| Kiểm kê | Đếm thực tế, đối chiếu |
| Cảnh báo | Sắp hết, quá hạn |
| Báo cáo XNK | Theo ngày/tuần/tháng |

### Module 3: Tài chính

| Tính năng | Mô tả |
|-----------|-------|
| Quỹ tiền mặt | Thu, chi, tồn quỹ |
| Tài khoản ngân hàng | Nhiều TK, theo dõi số dư |
| Ghi nhận chi phí | Theo danh mục |
| Đối soát | So khớp sổ sách |

### Module 4: Thuế

| Tính năng | Mô tả |
|-----------|-------|
| Tính VAT tự động | 8% hoặc 10% theo SP |
| Tính thuế TNCN | 1.5% (DV) hoặc 1% (bán hàng) |
| Tổng hợp theo quý | Chuẩn bị tờ khai |
| Kết nối E-Invoice | Phát hành HĐ điện tử |

### Module 5: Nhân sự

| Tính năng | Mô tả |
|-----------|-------|
| Quản lý NV | Thông tin, hợp đồng |
| Chấm công | Check-in/out |
| Tính lương | Theo ngày công |
| BHXH/BHYT | Trích nộp bảo hiểm |

### Module 6: Báo cáo

| Tính năng | Mô tả |
|-----------|-------|
| 7 Sổ sách kế toán | Theo quy định |
| Export | Excel, PDF |
| Dashboard | Biểu đồ trực quan |

---

## 📊 7 SỔ SÁCH KẾ TOÁN

### 1. Sổ Doanh Thu (Revenue Book)

```typescript
interface RevenueBookEntry {
  date: Date;
  invoiceNo: string;
  customerName: string;
  description: string;
  revenueBeforeVAT: number;
  vatAmount: number;
  totalRevenue: number;
  paymentMethod: 'cash' | 'bank';
}

// Query logic
const getRevenueBook = async (storeId: string, startDate: Date, endDate: Date) => {
  return await db.sales.findMany({
    where: {
      storeId,
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { payments: true, saleItems: true },
    orderBy: { createdAt: 'asc' }
  });
};
```

**Cột hiển thị:**
| Ngày | Số HĐ | Khách hàng | Diễn giải | Doanh thu chưa VAT | VAT | Tổng cộng | Hình thức |

---

### 2. Sổ Tiền Mặt (Cash Book)

```typescript
interface CashBookEntry {
  date: Date;
  voucherNo: string;
  description: string;
  debit: number;  // Thu
  credit: number; // Chi
  balance: number;
}

// Tự động cập nhật khi có giao dịch tiền mặt
const updateCashBook = async (transaction: CashTransaction) => {
  const lastEntry = await getLastCashEntry(transaction.storeId);
  const newBalance = transaction.type === 'income' 
    ? lastEntry.balance + transaction.amount
    : lastEntry.balance - transaction.amount;
  
  return await db.cashBook.create({
    data: {
      storeId: transaction.storeId,
      transactionDate: new Date(),
      description: transaction.description,
      referenceType: transaction.type,
      referenceId: transaction.referenceId,
      debit: transaction.type === 'income' ? transaction.amount : 0,
      credit: transaction.type === 'expense' ? transaction.amount : 0,
      balance: newBalance
    }
  });
};
```

**Cột hiển thị:**
| Ngày | Số CT | Diễn giải | Thu (Nợ) | Chi (Có) | Tồn quỹ |

---

### 3. Sổ Tiền Gửi Ngân Hàng (Bank Deposit Book)

```typescript
interface BankBookEntry {
  date: Date;
  bankAccount: string;
  transactionRef: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// Theo từng tài khoản ngân hàng
const getBankBook = async (bankAccountId: string, startDate: Date, endDate: Date) => {
  return await db.bankBook.findMany({
    where: {
      bankAccountId,
      transactionDate: { gte: startDate, lte: endDate }
    },
    orderBy: { transactionDate: 'asc' }
  });
};
```

**Cột hiển thị:**
| Ngày | Số TK | Số GD | Diễn giải | Ghi nợ | Ghi có | Số dư |

---

### 4. Sổ Chi Phí (Expense Book)

```typescript
interface ExpenseBookEntry {
  date: Date;
  voucherNo: string;
  category: string;
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: string;
}

// Phân loại chi phí theo TT88/2021
const EXPENSE_CATEGORIES = [
  'Mua hàng hóa',
  'Thuê mặt bằng',
  'Điện nước',
  'Lương nhân viên',
  'Vận chuyển',
  'Quảng cáo',
  'Bảo hiểm',
  'Khác'
];
```

**Cột hiển thị:**
| Ngày | Số CT | Loại chi phí | Diễn giải | Số tiền | VAT | Tổng | Hình thức TT |

---

### 5. Sổ Theo Dõi Tồn Kho (Inventory Tracking Book)

```typescript
interface InventoryBookEntry {
  date: Date;
  productSku: string;
  productName: string;
  unit: string;
  openingQty: number;
  importQty: number;
  exportQty: number;
  closingQty: number;
  unitValue: number;
  totalValue: number;
}

// Tính tồn kho theo FIFO hoặc bình quân gia quyền
const calculateInventory = async (storeId: string, period: DateRange) => {
  const products = await db.products.findMany({ where: { storeId } });
  
  return products.map(async (product) => {
    const logs = await db.inventoryLogs.findMany({
      where: {
        productId: product.id,
        createdAt: { gte: period.start, lte: period.end }
      }
    });
    
    const imports = logs.filter(l => l.type === 'import').reduce((sum, l) => sum + l.quantity, 0);
    const exports = logs.filter(l => ['export', 'sale'].includes(l.type)).reduce((sum, l) => sum + l.quantity, 0);
    
    return {
      product,
      openingQty: product.quantity - imports + exports,
      importQty: imports,
      exportQty: exports,
      closingQty: product.quantity
    };
  });
};
```

**Cột hiển thị:**
| Mã SP | Tên SP | ĐVT | Tồn đầu kỳ | Nhập | Xuất | Tồn cuối kỳ | Đơn giá | Thành tiền |

---

### 6. Sổ Nghĩa Vụ Thuế (Tax Obligation Book)

```typescript
interface TaxObligationEntry {
  period: string; // Q1/2026, Q2/2026...
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  vatCollected: number;      // VAT đầu ra
  vatDeductible: number;     // VAT đầu vào (từ chi phí)
  vatPayable: number;        // VAT phải nộp
  pitBase: number;           // Doanh thu tính thuế TNCN
  pitRate: number;           // 1% hoặc 1.5%
  pitPayable: number;        // TNCN phải nộp
  totalTaxPayable: number;
  status: 'draft' | 'declared' | 'paid';
}

// Tính thuế theo quý
const calculateQuarterlyTax = async (storeId: string, quarter: number, year: number) => {
  const periodStart = new Date(year, (quarter - 1) * 3, 1);
  const periodEnd = new Date(year, quarter * 3, 0);
  
  // Tổng doanh thu
  const sales = await db.sales.aggregate({
    where: {
      storeId,
      status: 'completed',
      createdAt: { gte: periodStart, lte: periodEnd }
    },
    _sum: { subtotal: true, vatAmount: true, total: true }
  });
  
  // VAT đầu vào (từ chi phí có hóa đơn)
  const expenses = await db.expenses.aggregate({
    where: {
      storeId,
      expenseDate: { gte: periodStart, lte: periodEnd },
      vatAmount: { gt: 0 }
    },
    _sum: { vatAmount: true }
  });
  
  const vatCollected = sales._sum.vatAmount || 0;
  const vatDeductible = expenses._sum.vatAmount || 0;
  const vatPayable = Math.max(0, vatCollected - vatDeductible);
  
  // Thuế TNCN (1.5% cho dịch vụ, 1% cho bán hàng)
  const pitRate = 0.015; // hoặc 0.01 tùy loại hình
  const pitPayable = (sales._sum.total || 0) * pitRate;
  
  return {
    period: `Q${quarter}/${year}`,
    periodStart,
    periodEnd,
    totalRevenue: sales._sum.total || 0,
    vatCollected,
    vatDeductible,
    vatPayable,
    pitBase: sales._sum.total || 0,
    pitRate,
    pitPayable,
    totalTaxPayable: vatPayable + pitPayable
  };
};
```

**Cột hiển thị:**
| Kỳ | Doanh thu | VAT đầu ra | VAT đầu vào | VAT nộp | TNCN | Tổng thuế | Trạng thái |

---

### 7. Sổ Lương (Salary/Payroll Book)

```typescript
interface SalaryBookEntry {
  period: string; // Tháng/Năm
  employeeName: string;
  position: string;
  workingDays: number;
  baseSalary: number;
  allowances: number;
  grossSalary: number;
  socialInsurance: number;  // 10.5% NV đóng
  healthInsurance: number;  // 1.5% NV đóng
  unemploymentInsurance: number; // 1% NV đóng
  pit: number;              // Thuế TNCN (nếu có)
  deductions: number;
  netSalary: number;
  paymentDate: Date;
}

// Tính lương theo tháng
const calculateMonthlySalary = async (employeeId: string, month: number, year: number) => {
  const employee = await db.employees.findUnique({ where: { id: employeeId } });
  const attendance = await getMonthlyAttendance(employeeId, month, year);
  
  const workingDays = attendance.presentDays;
  const standardDays = 26; // Ngày công chuẩn
  
  const baseSalary = (employee.baseSalary / standardDays) * workingDays;
  const allowances = employee.allowances || 0;
  const grossSalary = baseSalary + allowances;
  
  // Bảo hiểm (10.5% + 1.5% + 1% = 13% NV đóng)
  const insuranceBase = Math.min(grossSalary, 46800000); // Mức trần BHXH
  const socialInsurance = insuranceBase * 0.08;
  const healthInsurance = insuranceBase * 0.015;
  const unemploymentInsurance = insuranceBase * 0.01;
  
  // Thuế TNCN (nếu > 11 triệu/tháng sau giảm trừ)
  const personalDeduction = 11000000;
  const dependentDeduction = employee.dependents * 4400000;
  const taxableIncome = Math.max(0, grossSalary - socialInsurance - healthInsurance - unemploymentInsurance - personalDeduction - dependentDeduction);
  const pit = calculateProgressivePIT(taxableIncome);
  
  const netSalary = grossSalary - socialInsurance - healthInsurance - unemploymentInsurance - pit;
  
  return {
    employeeId,
    period: `${month}/${year}`,
    workingDays,
    baseSalary,
    allowances,
    grossSalary,
    socialInsurance,
    healthInsurance,
    unemploymentInsurance,
    pit,
    netSalary
  };
};
```

**Cột hiển thị:**
| Tháng | Họ tên | Chức vụ | Ngày công | Lương cơ bản | Phụ cấp | Tổng lương | BHXH | BHYT | BHTN | TNCN | Thực lĩnh |

---

## 🔌 TÍCH HỢP HÓA ĐƠN ĐIỆN TỬ

### Các nhà cung cấp được hỗ trợ

| Provider | API Type | Phí/tháng (ước tính) |
|----------|----------|----------------------|
| MISA meInvoice | REST API | 100k-300k VND |
| Viettel S-Invoice | SOAP/REST | 150k-400k VND |
| Sapo Invoice | REST API | Miễn phí (gói Sapo) |
| VNPT E-Invoice | REST API | 120k-350k VND |

### Flow tích hợp

```typescript
// Interface chung cho các provider
interface EInvoiceProvider {
  createInvoice(data: InvoiceData): Promise<InvoiceResult>;
  cancelInvoice(invoiceId: string, reason: string): Promise<boolean>;
  getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus>;
  downloadInvoice(invoiceId: string): Promise<Buffer>;
}

// Adapter pattern cho multi-provider
class MISAInvoiceAdapter implements EInvoiceProvider {
  async createInvoice(data: InvoiceData): Promise<InvoiceResult> {
    const response = await fetch('https://api.meinvoice.vn/api/v1/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        InvoiceType: 1, // Hóa đơn GTGT
        InvoiceSymbol: data.symbol,
        CustomerName: data.customerName,
        CustomerTaxCode: data.customerTaxCode,
        CustomerAddress: data.customerAddress,
        Items: data.items.map(item => ({
          ItemName: item.name,
          UnitName: item.unit,
          Quantity: item.quantity,
          UnitPrice: item.unitPrice,
          VATRate: item.vatRate,
          VATAmount: item.vatAmount,
          TotalAmount: item.totalAmount
        }))
      })
    });
    
    return response.json();
  }
}
```

---

## 📱 UI/UX RESPONSIVE

### Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px)  { /* sm: tablet portrait */ }
@media (min-width: 768px)  { /* md: tablet landscape */ }
@media (min-width: 1024px) { /* lg: desktop */ }
@media (min-width: 1280px) { /* xl: large desktop */ }
```

### Layout chính

```
Mobile (< 640px):
┌─────────────────────────┐
│ Header (Store name)     │
├─────────────────────────┤
│                         │
│   Main Content Area     │
│                         │
├─────────────────────────┤
│ Bottom Nav (5 icons)    │
└─────────────────────────┘

Tablet/Desktop (≥ 768px):
┌─────────────────────────────────────┐
│ Header (Logo + Store + User)        │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │    Main Content Area     │
│ (Menu)   │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

---

## 📅 LỘ TRÌNH TRIỂN KHAI

### Phase 1: Foundation (4 tuần)
- [ ] Setup project Next.js + TypeScript
- [ ] Thiết kế UI/UX (Figma)
- [ ] Database schema + Prisma
- [ ] Auth system (OTP via Zalo/SMS)
- [ ] CI/CD pipeline

### Phase 2: Core POS (6 tuần)
- [ ] Quản lý sản phẩm/danh mục
- [ ] Module bán hàng (cart, checkout)
- [ ] Thanh toán tiền mặt
- [ ] In hóa đơn (thermal printer)
- [ ] PWA offline mode

### Phase 3: Inventory (3 tuần)
- [ ] Nhập/Xuất kho
- [ ] Kiểm kê tồn kho
- [ ] Cảnh báo hết hàng
- [ ] Sổ theo dõi tồn kho

### Phase 4: Finance (4 tuần)
- [ ] Sổ tiền mặt
- [ ] Sổ tiền gửi ngân hàng
- [ ] Quản lý chi phí
- [ ] Sổ chi phí

### Phase 5: Tax Compliance (5 tuần)
- [ ] Tính VAT tự động
- [ ] Tích hợp E-Invoice (MISA/Viettel)
- [ ] Kê khai thuế theo quý
- [ ] Sổ nghĩa vụ thuế
- [ ] Sổ doanh thu

### Phase 6: HR & Payroll (3 tuần)
- [ ] Quản lý nhân viên
- [ ] Chấm công
- [ ] Tính lương + BHXH
- [ ] Sổ lương

### Phase 7: Reports & Analytics (4 tuần)
- [ ] 7 sổ sách kế toán
- [ ] Export Excel/PDF
- [ ] Dashboard thống kê
- [ ] Biểu đồ trực quan

### Phase 8: Testing & Launch (3 tuần)
- [ ] UAT Testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Go-live

**Tổng thời gian: ~32 tuần (8 tháng)**

---

## 💰 ƯỚC TÍNH CHI PHÍ

### Development Team

| Vai trò | Số lượng | Thời gian | Rate/tháng |
|---------|----------|-----------|------------|
| Tech Lead | 1 | 8 tháng | 40-60M VND |
| Frontend Dev | 2 | 8 tháng | 25-35M VND |
| Backend Dev | 2 | 8 tháng | 25-35M VND |
| UI/UX Designer | 1 | 3 tháng | 20-30M VND |
| QA Engineer | 1 | 4 tháng | 18-25M VND |

### Infrastructure (monthly)

| Service | Provider | Chi phí/tháng |
|---------|----------|---------------|
| Server | AWS/GCP | $100-300 |
| Database | RDS/Cloud SQL | $50-150 |
| Redis | ElastiCache | $30-50 |
| CDN | CloudFront | $20-50 |
| E-Invoice API | MISA/Viettel | 100k-400k VND |
| SMS/OTP | Vietguys/Esms | 500đ/SMS |

---

## ✅ CHECKLIST TUÂN THỦ THUẾ 2026

- [ ] Hỗ trợ kê khai theo quý (doanh thu 200M-3B)
- [ ] Tích hợp hóa đơn điện tử (doanh thu ≥1B)
- [ ] Lưu trữ sổ sách 10 năm
- [ ] Xuất 7 loại sổ sách theo quy định
- [ ] Tính đúng VAT (8% hoặc 10%)
- [ ] Tính thuế TNCN theo doanh thu
- [ ] Hỗ trợ nhiều hình thức thanh toán
- [ ] Đối soát tự động với ngân hàng
- [ ] Backup dữ liệu định kỳ
- [ ] Bảo mật thông tin khách hàng

---

## 📞 LIÊN HỆ HỖ TRỢ

Tài liệu tham khảo:
- Nghị quyết 68-NQ/TW (04/05/2025)
- Nghị định 70/2025/NĐ-CP về hóa đơn điện tử
- Thông tư 88/2021/TT-BTC về chế độ kế toán hộ kinh doanh
- Luật Thuế GTGT số 48/2024/QH15

---

*Tài liệu được tạo tự động dựa trên nghiên cứu quy định thuế Việt Nam 2026*
