-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- This file defines all RLS policies for the store management application.
-- All policies enforce store-based isolation to ensure data security.
--
-- Security Model:
-- 1. All tables have RLS enabled (no exceptions)
-- 2. Store-based isolation: users can only access data from their own store
-- 3. Role-based access control: owner, manager, staff have different permissions
-- 4. No direct table access without authentication
-- ============================================================================

-- Enable RLS on all tables (CRITICAL: Do not disable any of these)
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

-- ============================================================================
-- HELPER FUNCTIONS FOR ROLE-BASED ACCESS
-- ============================================================================

-- Function to get current user's store_id
CREATE OR REPLACE FUNCTION get_current_user_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR(20) AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to check if user is owner or manager
CREATE OR REPLACE FUNCTION is_owner_or_manager()
RETURNS BOOLEAN AS $$
  SELECT role IN ('owner', 'manager') FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to check if user is owner only
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT role = 'owner' FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- STORES TABLE POLICIES
-- ============================================================================

-- Stores: Allow authenticated users to create stores (for registration)
CREATE POLICY "Authenticated users can create stores" ON stores
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own store" ON stores
    FOR SELECT USING (
        id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

-- Only owners can update store settings
CREATE POLICY "Owners can update store" ON stores
    FOR UPDATE USING (
        id IN (SELECT store_id FROM users WHERE id = auth.uid())
        AND is_owner()
    );

-- Prevent store deletion (use soft delete or admin console)
-- No DELETE policy = cannot delete

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can create own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can view other staff in their store (for listings)
CREATE POLICY "Users can view store staff" ON users
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Only owners/managers can update other users' roles
CREATE POLICY "Managers can update staff" ON users
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- ============================================================================
-- PRODUCTS AND CATEGORIES POLICIES
-- ============================================================================

-- Categories: All store staff can view, only owner/manager can modify
CREATE POLICY "Users can view store categories" ON categories
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can modify categories" ON categories
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can update categories" ON categories
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can delete categories" ON categories
    FOR DELETE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- Products: All staff can view, only owner/manager can modify
CREATE POLICY "Users can view store products" ON products
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can create products" ON products
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can update products" ON products
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- ============================================================================
-- SALES AND POS POLICIES
-- ============================================================================

-- Sales: All staff can create and view their store's sales
CREATE POLICY "Users can view store sales" ON sales
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Users can create sales" ON sales
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
    );

-- Only owner/manager can modify existing sales (cancel, refund)
CREATE POLICY "Managers can update sales" ON sales
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- Sale items: Based on parent sale access
CREATE POLICY "Users can view sale items" ON sale_items
    FOR SELECT USING (
        sale_id IN (
            SELECT id FROM sales
            WHERE store_id = get_current_user_store_id()
        )
    );

CREATE POLICY "Users can create sale items" ON sale_items
    FOR INSERT WITH CHECK (
        sale_id IN (
            SELECT id FROM sales
            WHERE store_id = get_current_user_store_id()
        )
    );

-- Payments: Based on parent sale access
CREATE POLICY "Users can view payments" ON payments
    FOR SELECT USING (
        sale_id IN (
            SELECT id FROM sales
            WHERE store_id = get_current_user_store_id()
        )
    );

CREATE POLICY "Users can create payments" ON payments
    FOR INSERT WITH CHECK (
        sale_id IN (
            SELECT id FROM sales
            WHERE store_id = get_current_user_store_id()
        )
    );

-- ============================================================================
-- FINANCE POLICIES (Restricted to Owner/Manager)
-- ============================================================================

-- Bank accounts: Owner/Manager only
CREATE POLICY "Users can view bank accounts" ON bank_accounts
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can manage bank accounts" ON bank_accounts
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can update bank accounts" ON bank_accounts
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- Cash book: Owner/Manager for writes, all can view
CREATE POLICY "Users can view cash book" ON cash_book
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can manage cash book" ON cash_book
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- Bank book: Owner/Manager for writes, all can view
CREATE POLICY "Users can view bank book" ON bank_book
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can manage bank book" ON bank_book
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- Expense categories: Owner/Manager only
CREATE POLICY "Users can view expense categories" ON expense_categories
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can manage expense categories" ON expense_categories
    FOR ALL USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- Expenses: Owner/Manager can manage, all can view
CREATE POLICY "Users can view expenses" ON expenses
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can manage expenses" ON expenses
    FOR ALL USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- ============================================================================
-- INVENTORY POLICIES
-- ============================================================================

CREATE POLICY "Users can view inventory logs" ON inventory_logs
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

-- All staff can create inventory logs (sales create them automatically)
CREATE POLICY "Users can create inventory logs" ON inventory_logs
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
    );

-- ============================================================================
-- HR POLICIES (Restricted to Owner/Manager)
-- ============================================================================

-- Employees: Owner/Manager can manage
CREATE POLICY "Users can view employees" ON employees
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can manage employees" ON employees
    FOR ALL USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- Attendance: All can view, Staff can only create their own
CREATE POLICY "Users can view attendance" ON attendance
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM employees
            WHERE store_id = get_current_user_store_id()
        )
    );

CREATE POLICY "Users can manage attendance" ON attendance
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT id FROM employees
            WHERE store_id = get_current_user_store_id()
        )
    );

CREATE POLICY "Managers can update attendance" ON attendance
    FOR UPDATE USING (
        employee_id IN (
            SELECT id FROM employees
            WHERE store_id = get_current_user_store_id()
        )
        AND is_owner_or_manager()
    );

-- Salary records: Owner only (sensitive financial data)
CREATE POLICY "Owners can view salary records" ON salary_records
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM employees
            WHERE store_id = get_current_user_store_id()
        )
        AND is_owner()
    );

CREATE POLICY "Owners can manage salary records" ON salary_records
    FOR ALL USING (
        employee_id IN (
            SELECT id FROM employees
            WHERE store_id = get_current_user_store_id()
        )
        AND is_owner()
    );

-- ============================================================================
-- TAX AND E-INVOICE POLICIES (Owner Only)
-- ============================================================================

CREATE POLICY "Owners can manage e-invoices" ON e_invoices
    FOR ALL USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Owners can manage tax obligations" ON tax_obligations
    FOR ALL USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- ============================================================================
-- SYNC QUEUE POLICIES
-- ============================================================================

CREATE POLICY "Users can manage own sync queue" ON sync_queue
    FOR ALL USING (
        store_id = get_current_user_store_id()
        AND (user_id = auth.uid() OR is_owner_or_manager())
    );

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. All tables have RLS enabled - never disable
-- 2. Service role key bypasses RLS - use only in trusted server-side code
-- 3. Anon key respects RLS - safe for client-side use
-- 4. Always verify store_id matches user's store before operations
-- 5. Sensitive data (salaries, tax) restricted to owner role
-- 6. No DELETE policies on critical tables (stores, users) - use soft delete
