# 📱 PWA QUẢN LÝ CỬA HÀNG - SUPABASE
## Mobile-First | Edge Functions Only | Vietnam Tax 2026

---

## 🎯 NGUYÊN TẮC THIẾT KẾ

| Nguyên tắc | Mô tả |
|------------|-------|
| **Mobile-First** | Thiết kế cho mobile trước, mở rộng lên tablet/desktop |
| **Functions Only** | KHÔNG query trực tiếp từ client, mọi thao tác qua Edge Functions |
| **Offline-First** | IndexedDB cache, sync khi có mạng |
| **Security** | RLS + Edge Functions = double protection |

---

## 🏗️ TECH STACK

| Layer | Công nghệ | Lý do |
|-------|-----------|-------|
| **Frontend** | Next.js 14 + TypeScript | App Router, Server Components |
| **UI** | Tailwind CSS + shadcn/ui | Mobile-first utilities |
| **State** | Zustand + TanStack Query | Offline sync, caching |
| **Backend** | Supabase Edge Functions | Deno runtime, TypeScript |
| **Database** | Supabase PostgreSQL | RLS, Realtime, Free tier |
| **Auth** | Supabase Auth | Phone OTP, Magic Link |
| **Storage** | Supabase Storage | Product images, invoices |
| **Offline** | IndexedDB + Service Worker | PWA offline mode |

---

## 📁 CẤU TRÚC DỰ ÁN

```
store-management-pwa/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── verify/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx            # Bottom nav layout
│   │   ├── page.tsx              # Dashboard
│   │   ├── pos/
│   │   │   ├── page.tsx          # POS main
│   │   │   ├── cart/page.tsx
│   │   │   └── checkout/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── import/page.tsx
│   │   │   └── check/page.tsx
│   │   ├── finance/
│   │   │   ├── page.tsx
│   │   │   ├── cash/page.tsx
│   │   │   └── bank/page.tsx
│   │   ├── tax/
│   │   │   ├── page.tsx
│   │   │   └── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── manifest.json
│   └── sw.ts                     # Service Worker
├── components/
│   ├── ui/                       # shadcn components
│   ├── mobile/
│   │   ├── BottomNav.tsx
│   │   ├── MobileHeader.tsx
│   │   ├── SwipeableCard.tsx
│   │   └── PullToRefresh.tsx
│   ├── pos/
│   │   ├── ProductGrid.tsx
│   │   ├── CartSheet.tsx
│   │   ├── BarcodeScanner.tsx
│   │   └── PaymentModal.tsx
│   └── reports/
│       └── ReportViewer.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (auth only)
│   │   └── functions.ts          # Edge function callers
│   ├── offline/
│   │   ├── db.ts                 # IndexedDB setup
│   │   └── sync.ts               # Sync manager
│   └── hooks/
│       ├── useOffline.ts
│       └── useSync.ts
├── supabase/
│   ├── migrations/               # SQL migrations
│   │   ├── 001_initial.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_functions.sql
│   └── functions/                # Edge Functions
│       ├── pos/
│       │   ├── create-sale/index.ts
│       │   ├── get-products/index.ts
│       │   └── process-payment/index.ts
│       ├── inventory/
│       │   ├── import-stock/index.ts
│       │   ├── export-stock/index.ts
│       │   └── get-inventory/index.ts
│       ├── finance/
│       │   ├── cash-transaction/index.ts
│       │   ├── bank-transaction/index.ts
│       │   └── get-balance/index.ts
│       ├── tax/
│       │   ├── calculate-vat/index.ts
│       │   ├── create-invoice/index.ts
│       │   └── quarterly-report/index.ts
│       ├── hr/
│       │   ├── attendance/index.ts
│       │   └── calculate-salary/index.ts
│       └── reports/
│           ├── revenue-book/index.ts
│           ├── cash-book/index.ts
│           ├── bank-book/index.ts
│           ├── expense-book/index.ts
│           ├── inventory-book/index.ts
│           ├── tax-book/index.ts
│           └── salary-book/index.ts
└── public/
    ├── icons/
    └── manifest.json
```

---

## 🗄️ DATABASE SCHEMA (Supabase PostgreSQL)

### Migration 001: Initial Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(20) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    revenue_tier VARCHAR(20) DEFAULT 'under_200m' 
        CHECK (revenue_tier IN ('under_200m', '200m_1b', '1b_3b', 'over_3b')),
    e_invoice_required BOOLEAN DEFAULT FALSE,
    e_invoice_provider VARCHAR(20),
    e_invoice_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id),
    name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    sku VARCHAR(50),
    barcode VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(20) DEFAULT 'cái',
    cost_price DECIMAL(15,2) DEFAULT 0,
    sell_price DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(4,2) DEFAULT 8.00,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);

-- Sales
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    invoice_no VARCHAR(50),
    subtotal DECIMAL(15,2) DEFAULT 0,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_tax_code VARCHAR(20),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sales_store_date ON sales(store_id, created_at DESC);

-- Sale Items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(4,2) DEFAULT 8.00,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL 
        CHECK (method IN ('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay')),
    amount DECIMAL(15,2) NOT NULL,
    bank_account_id UUID,
    bank_ref VARCHAR(100),
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    account_name VARCHAR(255),
    branch VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Book
CREATE TABLE cash_book (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    voucher_no VARCHAR(50),
    description TEXT,
    reference_type VARCHAR(20) CHECK (reference_type IN ('sale', 'expense', 'adjustment', 'salary')),
    reference_id UUID,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cash_book_store_date ON cash_book(store_id, transaction_date DESC);

-- Bank Book
CREATE TABLE bank_book (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES bank_accounts(id),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    voucher_no VARCHAR(50),
    description TEXT,
    reference_type VARCHAR(20),
    reference_id UUID,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    bank_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Categories
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    is_deductible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id),
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'bank_transfer')),
    bank_account_id UUID REFERENCES bank_accounts(id),
    invoice_no VARCHAR(50),
    supplier_name VARCHAR(255),
    supplier_tax_code VARCHAR(20),
    expense_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Logs
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('import', 'export', 'sale', 'return', 'adjustment')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(15,2),
    total_value DECIMAL(15,2),
    reference_type VARCHAR(50),
    reference_id UUID,
    note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id, created_at DESC);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    id_card VARCHAR(20),
    position VARCHAR(100),
    base_salary DECIMAL(15,2) DEFAULT 0,
    allowances DECIMAL(15,2) DEFAULT 0,
    dependents INTEGER DEFAULT 0,
    hire_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'present' 
        CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, work_date)
);

-- Salary Records
CREATE TABLE salary_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    working_days INTEGER DEFAULT 0,
    base_salary DECIMAL(15,2) DEFAULT 0,
    allowances DECIMAL(15,2) DEFAULT 0,
    overtime_pay DECIMAL(15,2) DEFAULT 0,
    gross_salary DECIMAL(15,2) DEFAULT 0,
    social_insurance DECIMAL(15,2) DEFAULT 0,
    health_insurance DECIMAL(15,2) DEFAULT 0,
    unemployment_insurance DECIMAL(15,2) DEFAULT 0,
    pit DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) DEFAULT 0,
    payment_method VARCHAR(20),
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, period_month, period_year)
);

-- E-Invoices
CREATE TABLE e_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id),
    store_id UUID REFERENCES stores(id),
    invoice_symbol VARCHAR(20),
    invoice_no VARCHAR(20),
    issue_date TIMESTAMPTZ,
    provider VARCHAR(20) CHECK (provider IN ('misa', 'viettel', 'sapo', 'vnpt')),
    provider_invoice_id VARCHAR(100),
    tax_authority_code VARCHAR(50),
    lookup_code VARCHAR(100),
    qr_code TEXT,
    pdf_url TEXT,
    xml_content TEXT,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'issued', 'cancelled', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax Obligations
CREATE TABLE tax_obligations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    period_type VARCHAR(20) DEFAULT 'quarterly' CHECK (period_type IN ('monthly', 'quarterly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    vat_collected DECIMAL(15,2) DEFAULT 0,
    vat_deductible DECIMAL(15,2) DEFAULT 0,
    vat_payable DECIMAL(15,2) DEFAULT 0,
    pit_base DECIMAL(15,2) DEFAULT 0,
    pit_rate DECIMAL(4,2) DEFAULT 1.5,
    pit_payable DECIMAL(15,2) DEFAULT 0,
    total_tax DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'declared', 'paid')),
    declared_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, period_start, period_end)
);

-- Sync Queue (for offline support)
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_pending ON sync_queue(store_id, status) WHERE status = 'pending';
```

### Migration 002: RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE e_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_obligations ENABLE ROW LEVEL SECURITY;

-- Users can only access their store's data
CREATE POLICY "Users can view own store" ON stores
    FOR SELECT USING (
        id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can view store products" ON products
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage store sales" ON sales
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

-- Service role bypass for Edge Functions
-- Edge Functions use service_role key which bypasses RLS
```

---

## ⚡ EDGE FUNCTIONS

### Cấu trúc Function

```typescript
// supabase/functions/_shared/supabase.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const createSupabaseClient = (req: Request) => {
  const authHeader = req.headers.get('Authorization')!
  
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Service role for DB access
    {
      global: {
        headers: { Authorization: authHeader }
      }
    }
  )
}

export const getUser = async (supabase: any) => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

export const getUserStore = async (supabase: any, userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('store_id, role')
    .eq('id', userId)
    .single()
  
  if (error || !data) throw new Error('Store not found')
  return data
}
```

### POS Functions

```typescript
// supabase/functions/pos/get-products/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getUser, getUserStore } from '../../_shared/supabase.ts'

serve(async (req) => {
  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)
    
    const { searchTerm, categoryId, page = 1, limit = 20 } = await req.json()
    
    let query = supabase
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .eq('store_id', store_id)
      .eq('active', true)
      .order('name')
      .range((page - 1) * limit, page * limit - 1)
    
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,barcode.eq.${searchTerm},sku.ilike.%${searchTerm}%`)
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ products: data, total: count }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

```typescript
// supabase/functions/pos/create-sale/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getUser, getUserStore } from '../../_shared/supabase.ts'

interface SaleItem {
  product_id: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount?: number
}

interface CreateSaleRequest {
  items: SaleItem[]
  customer_name?: string
  customer_phone?: string
  customer_tax_code?: string
  discount?: number
  note?: string
  payments: { method: string; amount: number; bank_ref?: string }[]
}

serve(async (req) => {
  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)
    
    const body: CreateSaleRequest = await req.json()
    
    // Calculate totals
    let subtotal = 0
    let vatAmount = 0
    
    const saleItems = body.items.map(item => {
      const itemVat = item.unit_price * item.quantity * (item.vat_rate / 100)
      const itemTotal = item.unit_price * item.quantity + itemVat - (item.discount || 0)
      subtotal += item.unit_price * item.quantity
      vatAmount += itemVat
      
      return {
        ...item,
        vat_amount: itemVat,
        total: itemTotal
      }
    })
    
    const total = subtotal + vatAmount - (body.discount || 0)
    
    // Generate invoice number
    const today = new Date()
    const invoiceNo = `HD${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${Date.now().toString().slice(-6)}`
    
    // Start transaction
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id,
        user_id: user.id,
        invoice_no: invoiceNo,
        subtotal,
        vat_amount: vatAmount,
        discount: body.discount || 0,
        total,
        status: 'completed',
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_tax_code: body.customer_tax_code,
        note: body.note,
        completed_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (saleError) throw saleError
    
    // Insert sale items
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems.map(item => ({
        sale_id: sale.id,
        ...item
      })))
    
    if (itemsError) throw itemsError
    
    // Insert payments
    const { error: paymentsError } = await supabase
      .from('payments')
      .insert(body.payments.map(p => ({
        sale_id: sale.id,
        method: p.method,
        amount: p.amount,
        bank_ref: p.bank_ref
      })))
    
    if (paymentsError) throw paymentsError
    
    // Update inventory
    for (const item of body.items) {
      await supabase.rpc('decrease_product_quantity', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      })
      
      await supabase.from('inventory_logs').insert({
        store_id,
        product_id: item.product_id,
        type: 'sale',
        quantity: -item.quantity,
        reference_type: 'sale',
        reference_id: sale.id,
        created_by: user.id
      })
    }
    
    // Record to cash/bank book
    for (const payment of body.payments) {
      if (payment.method === 'cash') {
        await supabase.rpc('record_cash_transaction', {
          p_store_id: store_id,
          p_description: `Bán hàng - ${invoiceNo}`,
          p_reference_type: 'sale',
          p_reference_id: sale.id,
          p_debit: payment.amount,
          p_credit: 0,
          p_user_id: user.id
        })
      } else {
        await supabase.rpc('record_bank_transaction', {
          p_store_id: store_id,
          p_description: `Bán hàng - ${invoiceNo}`,
          p_reference_type: 'sale',
          p_reference_id: sale.id,
          p_debit: payment.amount,
          p_credit: 0,
          p_bank_ref: payment.bank_ref
        })
      }
    }
    
    return new Response(
      JSON.stringify({ sale, invoice_no: invoiceNo }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Report Functions

```typescript
// supabase/functions/reports/revenue-book/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseClient, getUser, getUserStore } from '../../_shared/supabase.ts'

serve(async (req) => {
  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)
    
    const { start_date, end_date } = await req.json()
    
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        invoice_no,
        customer_name,
        subtotal,
        vat_amount,
        total,
        created_at,
        payments(method, amount)
      `)
      .eq('store_id', store_id)
      .eq('status', 'completed')
      .gte('created_at', start_date)
      .lte('created_at', end_date)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    // Calculate totals
    const totals = data.reduce((acc, sale) => ({
      subtotal: acc.subtotal + Number(sale.subtotal),
      vat: acc.vat + Number(sale.vat_amount),
      total: acc.total + Number(sale.total)
    }), { subtotal: 0, vat: 0, total: 0 })
    
    // Format for report
    const entries = data.map((sale, index) => ({
      stt: index + 1,
      date: sale.created_at,
      invoice_no: sale.invoice_no,
      customer_name: sale.customer_name || 'Khách lẻ',
      description: 'Bán hàng',
      revenue_before_vat: sale.subtotal,
      vat_amount: sale.vat_amount,
      total_revenue: sale.total,
      payment_method: sale.payments?.[0]?.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'
    }))
    
    return new Response(
      JSON.stringify({
        report_name: 'SỔ DOANH THU',
        period: { start_date, end_date },
        entries,
        totals
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

```typescript
// supabase/functions/reports/tax-book/index.ts
serve(async (req) => {
  try {
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase)
    const { store_id } = await getUserStore(supabase, user.id)
    
    const { quarter, year } = await req.json()
    
    const periodStart = new Date(year, (quarter - 1) * 3, 1)
    const periodEnd = new Date(year, quarter * 3, 0)
    
    // Get total revenue
    const { data: salesData } = await supabase
      .from('sales')
      .select('subtotal, vat_amount, total')
      .eq('store_id', store_id)
      .eq('status', 'completed')
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
    
    const totalRevenue = salesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0
    const vatCollected = salesData?.reduce((sum, s) => sum + Number(s.vat_amount), 0) || 0
    
    // Get deductible VAT from expenses
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('vat_amount')
      .eq('store_id', store_id)
      .gte('expense_date', periodStart.toISOString())
      .lte('expense_date', periodEnd.toISOString())
      .gt('vat_amount', 0)
    
    const vatDeductible = expenseData?.reduce((sum, e) => sum + Number(e.vat_amount), 0) || 0
    
    // Calculate taxes
    const vatPayable = Math.max(0, vatCollected - vatDeductible)
    const pitRate = 0.015 // 1.5% for services, 1% for retail
    const pitPayable = totalRevenue * pitRate
    const totalTax = vatPayable + pitPayable
    
    return new Response(
      JSON.stringify({
        report_name: 'SỔ NGHĨA VỤ THUẾ',
        period: `Quý ${quarter}/${year}`,
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,
        vat_collected: vatCollected,
        vat_deductible: vatDeductible,
        vat_payable: vatPayable,
        pit_rate: pitRate * 100,
        pit_payable: pitPayable,
        total_tax: totalTax
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## 📱 CLIENT CODE (Mobile-First)

### API Client (Functions Only)

```typescript
// lib/supabase/functions.ts
import { supabase } from './client'

const callFunction = async <T>(name: string, body: Record<string, any>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body })
  
  if (error) throw new Error(error.message)
  return data as T
}

// POS
export const posApi = {
  getProducts: (params: { searchTerm?: string; categoryId?: string; page?: number }) =>
    callFunction<{ products: Product[]; total: number }>('pos/get-products', params),
  
  createSale: (data: CreateSaleRequest) =>
    callFunction<{ sale: Sale; invoice_no: string }>('pos/create-sale', data),
  
  refundSale: (saleId: string, reason: string) =>
    callFunction('pos/refund-sale', { sale_id: saleId, reason })
}

// Inventory
export const inventoryApi = {
  getInventory: (params: { page?: number; lowStock?: boolean }) =>
    callFunction('inventory/get-inventory', params),
  
  importStock: (data: { product_id: string; quantity: number; unit_cost: number; note?: string }) =>
    callFunction('inventory/import-stock', data),
  
  exportStock: (data: { product_id: string; quantity: number; reason: string }) =>
    callFunction('inventory/export-stock', data)
}

// Finance
export const financeApi = {
  getCashBalance: () => callFunction('finance/get-balance', { type: 'cash' }),
  getBankBalance: () => callFunction('finance/get-balance', { type: 'bank' }),
  
  recordCashTransaction: (data: CashTransaction) =>
    callFunction('finance/cash-transaction', data),
  
  recordExpense: (data: ExpenseData) =>
    callFunction('finance/record-expense', data)
}

// Reports
export const reportsApi = {
  getRevenueBook: (startDate: string, endDate: string) =>
    callFunction('reports/revenue-book', { start_date: startDate, end_date: endDate }),
  
  getCashBook: (startDate: string, endDate: string) =>
    callFunction('reports/cash-book', { start_date: startDate, end_date: endDate }),
  
  getBankBook: (startDate: string, endDate: string, bankAccountId?: string) =>
    callFunction('reports/bank-book', { start_date: startDate, end_date: endDate, bank_account_id: bankAccountId }),
  
  getExpenseBook: (startDate: string, endDate: string) =>
    callFunction('reports/expense-book', { start_date: startDate, end_date: endDate }),
  
  getInventoryBook: (startDate: string, endDate: string) =>
    callFunction('reports/inventory-book', { start_date: startDate, end_date: endDate }),
  
  getTaxBook: (quarter: number, year: number) =>
    callFunction('reports/tax-book', { quarter, year }),
  
  getSalaryBook: (month: number, year: number) =>
    callFunction('reports/salary-book', { month, year })
}
```

### Mobile Layout Component

```tsx
// components/mobile/MobileLayout.tsx
'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, ShoppingCart, Package, Wallet, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Trang chủ' },
  { href: '/pos', icon: ShoppingCart, label: 'Bán hàng' },
  { href: '/inventory', icon: Package, label: 'Kho' },
  { href: '/finance', icon: Wallet, label: 'Thu chi' },
  { href: '/reports', icon: BarChart3, label: 'Báo cáo' },
]

export function MobileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border safe-area-bottom">
        <div className="grid grid-cols-5 h-full">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
```

### POS Screen (Mobile-First)

```tsx
// app/(main)/pos/page.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ShoppingCart, Scan } from 'lucide-react'
import { posApi } from '@/lib/supabase/functions'
import { useCartStore } from '@/lib/stores/cart'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartSheet } from '@/components/pos/CartSheet'
import { BarcodeScanner } from '@/components/pos/BarcodeScanner'

export default function POSPage() {
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const cart = useCartStore()
  
  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => posApi.getProducts({ searchTerm: search }),
  })
  
  const handleBarcodeScan = async (barcode: string) => {
    const result = await posApi.getProducts({ searchTerm: barcode })
    if (result.products.length > 0) {
      cart.addItem(result.products[0])
    }
    setShowScanner(false)
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <header className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowScanner(true)}>
            <Scan className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      {/* Product Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <ProductGrid 
          products={data?.products || []} 
          isLoading={isLoading}
          onProductClick={(product) => cart.addItem(product)}
        />
      </div>
      
      {/* Cart Button - Fixed */}
      {cart.items.length > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              className="fixed bottom-20 right-4 h-14 px-6 rounded-full shadow-lg"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {cart.items.length} sản phẩm • {cart.total.toLocaleString('vi-VN')}đ
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <CartSheet />
          </SheetContent>
        </Sheet>
      )}
      
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  )
}
```

### Offline Sync

```typescript
// lib/offline/sync.ts
import Dexie from 'dexie'
import { supabase } from '@/lib/supabase/client'

class OfflineDB extends Dexie {
  products!: Dexie.Table<Product, string>
  pendingSales!: Dexie.Table<PendingSale, string>
  syncQueue!: Dexie.Table<SyncItem, string>
  
  constructor() {
    super('StoreManagementDB')
    this.version(1).stores({
      products: 'id, barcode, sku, name',
      pendingSales: 'id, created_at',
      syncQueue: 'id, action, status'
    })
  }
}

export const offlineDb = new OfflineDB()

export const syncManager = {
  // Queue offline action
  queueAction: async (action: string, tableName: string, payload: any) => {
    await offlineDb.syncQueue.add({
      id: crypto.randomUUID(),
      action,
      table_name: tableName,
      payload,
      status: 'pending',
      created_at: new Date().toISOString()
    })
  },
  
  // Sync when online
  sync: async () => {
    const pendingItems = await offlineDb.syncQueue
      .where('status')
      .equals('pending')
      .toArray()
    
    for (const item of pendingItems) {
      try {
        await supabase.functions.invoke(`sync/${item.action}`, {
          body: item.payload
        })
        
        await offlineDb.syncQueue.update(item.id, { status: 'completed' })
      } catch (error) {
        await offlineDb.syncQueue.update(item.id, { 
          status: 'failed',
          error_message: error.message 
        })
      }
    }
  },
  
  // Cache products for offline use
  cacheProducts: async (products: Product[]) => {
    await offlineDb.products.bulkPut(products)
  },
  
  // Get cached products
  getCachedProducts: async (searchTerm?: string) => {
    if (searchTerm) {
      return offlineDb.products
        .where('name')
        .startsWithIgnoreCase(searchTerm)
        .or('barcode')
        .equals(searchTerm)
        .toArray()
    }
    return offlineDb.products.toArray()
  }
}

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncManager.sync()
  })
}
```

---

## 📊 7 SỔ SÁCH - EXPORT FORMAT

```typescript
// lib/reports/export.ts
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export const exportToExcel = (reportData: ReportData, filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(reportData.entries)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, reportData.report_name)
  
  // Add totals row
  XLSX.utils.sheet_add_json(worksheet, [reportData.totals], {
    origin: -1,
    skipHeader: true
  })
  
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export const exportToPDF = (reportData: ReportData, filename: string) => {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(16)
  doc.text(reportData.report_name, 105, 15, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Kỳ: ${reportData.period.start_date} - ${reportData.period.end_date}`, 105, 22, { align: 'center' })
  
  // Table
  doc.autoTable({
    head: [Object.keys(reportData.entries[0] || {})],
    body: reportData.entries.map(Object.values),
    startY: 30,
    styles: { fontSize: 8 }
  })
  
  doc.save(`${filename}.pdf`)
}
```

---

## 📅 LỘ TRÌNH CẬP NHẬT

| Phase | Thời gian | Nội dung |
|-------|-----------|----------|
| **1. Setup** | 2 tuần | Supabase project, Auth, Database schema, Edge Functions boilerplate |
| **2. Core POS** | 4 tuần | Products, Sales, Payments, Offline cache |
| **3. Inventory** | 2 tuần | Import/Export, Stock tracking, Alerts |
| **4. Finance** | 3 tuần | Cash book, Bank book, Expenses |
| **5. Tax** | 3 tuần | VAT calculation, E-Invoice integration, Tax reports |
| **6. HR** | 2 tuần | Employees, Attendance, Salary |
| **7. Reports** | 2 tuần | 7 accounting books, Export Excel/PDF |
| **8. Polish** | 2 tuần | PWA optimization, Testing, Launch |

**Tổng: ~20 tuần (5 tháng)**

---

## 💰 CHI PHÍ SUPABASE

| Tier | Giá | Phù hợp |
|------|-----|---------|
| **Free** | $0/month | Dev, <500 MAU |
| **Pro** | $25/month | Production, <100K MAU |
| **Team** | $599/month | Enterprise |

**Ước tính cho cửa hàng nhỏ:** Free hoặc Pro tier là đủ.

---

*Cập nhật: Supabase + Edge Functions + Mobile-First*
