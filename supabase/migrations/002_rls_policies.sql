-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE e_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Stores: Allow authenticated users to create stores (for registration)
CREATE POLICY "Authenticated users can create stores" ON stores
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own store" ON stores
    FOR SELECT USING (
        id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can update own store" ON stores
    FOR UPDATE USING (
        id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

-- Users: Allow authenticated users to create their profile (for registration)
CREATE POLICY "Users can create own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Store-based policies for all other tables
CREATE POLICY "Users can manage store categories" ON categories
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage store products" ON products
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage store sales" ON sales
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage sale items" ON sale_items
    FOR ALL USING (
        sale_id IN (
            SELECT id FROM sales 
            WHERE store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage payments" ON payments
    FOR ALL USING (
        sale_id IN (
            SELECT id FROM sales 
            WHERE store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage bank accounts" ON bank_accounts
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage cash book" ON cash_book
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage bank book" ON bank_book
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage expense categories" ON expense_categories
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage expenses" ON expenses
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage inventory logs" ON inventory_logs
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage employees" ON employees
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage attendance" ON attendance
    FOR ALL USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage salary records" ON salary_records
    FOR ALL USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage e-invoices" ON e_invoices
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage tax obligations" ON tax_obligations
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage sync queue" ON sync_queue
    FOR ALL USING (
        store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );
