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
    cost_price INTEGER DEFAULT 0,
    sell_price INTEGER NOT NULL,
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
CREATE INDEX idx_products_category ON products(category_id);

-- Sales
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    invoice_no VARCHAR(50),
    subtotal INTEGER DEFAULT 0,
    vat_amount INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
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
CREATE INDEX idx_sales_invoice ON sales(invoice_no);

-- Sale Items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    vat_rate DECIMAL(4,2) DEFAULT 8.00,
    vat_amount INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    total INTEGER NOT NULL
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL 
        CHECK (method IN ('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay')),
    amount INTEGER NOT NULL,
    bank_account_id UUID,
    bank_ref VARCHAR(100),
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_sale ON payments(sale_id);

-- Bank Accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    account_name VARCHAR(255),
    branch VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    balance INTEGER DEFAULT 0,
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
    debit INTEGER DEFAULT 0,
    credit INTEGER DEFAULT 0,
    balance INTEGER DEFAULT 0,
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
    reference_type VARCHAR(50),
    reference_id UUID,
    debit INTEGER DEFAULT 0,
    credit INTEGER DEFAULT 0,
    balance INTEGER DEFAULT 0,
    bank_ref VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_book_store_date ON bank_book(store_id, transaction_date DESC);

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
    amount INTEGER NOT NULL,
    vat_amount INTEGER DEFAULT 0,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'bank_transfer')),
    bank_account_id UUID REFERENCES bank_accounts(id),
    invoice_no VARCHAR(50),
    supplier_name VARCHAR(255),
    supplier_tax_code VARCHAR(20),
    expense_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_store_date ON expenses(store_id, expense_date DESC);

-- Inventory Logs
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('import', 'export', 'sale', 'return', 'adjustment')),
    quantity INTEGER NOT NULL,
    unit_cost INTEGER,
    total_value INTEGER,
    reference_type VARCHAR(50),
    reference_id UUID,
    note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id, created_at DESC);
CREATE INDEX idx_inventory_logs_store ON inventory_logs(store_id, created_at DESC);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    id_card VARCHAR(20),
    position VARCHAR(100),
    base_salary INTEGER DEFAULT 0,
    allowances INTEGER DEFAULT 0,
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
    base_salary INTEGER DEFAULT 0,
    allowances INTEGER DEFAULT 0,
    overtime_pay INTEGER DEFAULT 0,
    gross_salary INTEGER DEFAULT 0,
    social_insurance INTEGER DEFAULT 0,
    health_insurance INTEGER DEFAULT 0,
    unemployment_insurance INTEGER DEFAULT 0,
    pit INTEGER DEFAULT 0,
    deductions INTEGER DEFAULT 0,
    net_salary INTEGER DEFAULT 0,
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
    total_revenue INTEGER DEFAULT 0,
    vat_collected INTEGER DEFAULT 0,
    vat_deductible INTEGER DEFAULT 0,
    vat_payable INTEGER DEFAULT 0,
    pit_base INTEGER DEFAULT 0,
    pit_rate DECIMAL(4,2) DEFAULT 1.5,
    pit_payable INTEGER DEFAULT 0,
    total_tax INTEGER DEFAULT 0,
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

-- Invoice number sequence
CREATE SEQUENCE invoice_no_seq START 1;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_no(store_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_no TEXT;
BEGIN
    new_no := 'HD' || TO_CHAR(NOW(), 'YYYYMM') || LPAD(nextval('invoice_no_seq')::TEXT, 5, '0');
    RETURN new_no;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
