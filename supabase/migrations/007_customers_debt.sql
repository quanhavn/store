-- ============================================================================
-- CUSTOMER AND DEBT MANAGEMENT
-- ============================================================================
-- This migration adds tables for customer management and debt/credit tracking.
-- Supports credit sales and installment payment plans.
--
-- Tables:
-- 1. customers - Customer information with cached debt totals
-- 2. customer_debts - Debt records (credit sales or installment plans)
-- 3. debt_installments - Individual installments for payment plans
-- 4. debt_payments - Payment records for debts
--
-- Also modifies the sales table to support partial payments.
-- ============================================================================

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    tax_code VARCHAR(20),
    notes TEXT,
    total_debt INTEGER DEFAULT 0,  -- Cached total outstanding debt
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, phone)  -- One customer per phone per store
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(store_id, name);

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- CUSTOMER DEBTS TABLE
-- ============================================================================

CREATE TABLE customer_debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id),
    debt_type VARCHAR(20) NOT NULL CHECK (debt_type IN ('credit', 'installment')),
    original_amount INTEGER NOT NULL,
    remaining_amount INTEGER NOT NULL,
    due_date DATE,  -- Single due date for credit sales
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'cancelled')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_debts_customer ON customer_debts(customer_id);
CREATE INDEX idx_customer_debts_store ON customer_debts(store_id);
CREATE INDEX idx_customer_debts_status ON customer_debts(store_id, status);
CREATE INDEX idx_customer_debts_due ON customer_debts(store_id, due_date) WHERE status = 'active';

CREATE TRIGGER update_customer_debts_updated_at
    BEFORE UPDATE ON customer_debts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- DEBT INSTALLMENTS TABLE
-- ============================================================================

CREATE TABLE debt_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID REFERENCES customer_debts(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    due_date DATE NOT NULL,
    paid_amount INTEGER DEFAULT 0,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debt_installments_debt ON debt_installments(debt_id);
CREATE INDEX idx_debt_installments_due ON debt_installments(due_date) WHERE status IN ('pending', 'partial');

-- ============================================================================
-- DEBT PAYMENTS TABLE
-- ============================================================================

CREATE TABLE debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    debt_id UUID REFERENCES customer_debts(id) ON DELETE CASCADE,
    installment_id UUID REFERENCES debt_installments(id),
    amount INTEGER NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer')),
    bank_account_id UUID REFERENCES bank_accounts(id),
    bank_ref VARCHAR(100),
    notes TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX idx_debt_payments_store ON debt_payments(store_id, paid_at DESC);

-- ============================================================================
-- MODIFY SALES TABLE FOR CREDIT SALES
-- ============================================================================

ALTER TABLE sales ADD COLUMN customer_id UUID REFERENCES customers(id);
ALTER TABLE sales ADD COLUMN payment_status VARCHAR(20) DEFAULT 'paid'
    CHECK (payment_status IN ('paid', 'partial', 'unpaid'));
ALTER TABLE sales ADD COLUMN amount_paid INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN amount_due INTEGER DEFAULT 0;

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_payment_status ON sales(store_id, payment_status) WHERE payment_status != 'paid';

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CUSTOMERS RLS POLICIES
-- Users can view store customers, staff can create, managers can update
-- ============================================================================

CREATE POLICY "Users can view store customers" ON customers
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Staff can create customers" ON customers
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can update customers" ON customers
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can delete customers" ON customers
    FOR DELETE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- ============================================================================
-- CUSTOMER DEBTS RLS POLICIES
-- Users can view, staff can create, managers can update
-- ============================================================================

CREATE POLICY "Users can view store debts" ON customer_debts
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Staff can create debts" ON customer_debts
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can update debts" ON customer_debts
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can delete debts" ON customer_debts
    FOR DELETE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- ============================================================================
-- DEBT INSTALLMENTS RLS POLICIES
-- Users can view, managers can manage
-- ============================================================================

CREATE POLICY "Users can view debt installments" ON debt_installments
    FOR SELECT USING (
        debt_id IN (
            SELECT id FROM customer_debts
            WHERE store_id = get_current_user_store_id()
        )
    );

CREATE POLICY "Managers can create installments" ON debt_installments
    FOR INSERT WITH CHECK (
        debt_id IN (
            SELECT id FROM customer_debts
            WHERE store_id = get_current_user_store_id()
        )
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can update installments" ON debt_installments
    FOR UPDATE USING (
        debt_id IN (
            SELECT id FROM customer_debts
            WHERE store_id = get_current_user_store_id()
        )
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can delete installments" ON debt_installments
    FOR DELETE USING (
        debt_id IN (
            SELECT id FROM customer_debts
            WHERE store_id = get_current_user_store_id()
        )
        AND is_owner_or_manager()
    );

-- ============================================================================
-- DEBT PAYMENTS RLS POLICIES
-- Users can view and create
-- ============================================================================

CREATE POLICY "Users can view debt payments" ON debt_payments
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Users can create debt payments" ON debt_payments
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
    );

-- Managers can update/delete payments if needed
CREATE POLICY "Managers can update debt payments" ON debt_payments
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can delete debt payments" ON debt_payments
    FOR DELETE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

-- ============================================================================
-- HELPER FUNCTIONS FOR DEBT MANAGEMENT
-- ============================================================================

-- Function to update customer's total debt
CREATE OR REPLACE FUNCTION update_customer_total_debt()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the customer's total debt based on all active debts
    IF TG_OP = 'DELETE' THEN
        UPDATE customers
        SET total_debt = COALESCE((
            SELECT SUM(remaining_amount)
            FROM customer_debts
            WHERE customer_id = OLD.customer_id
            AND status = 'active'
        ), 0)
        WHERE id = OLD.customer_id;
        RETURN OLD;
    ELSE
        UPDATE customers
        SET total_debt = COALESCE((
            SELECT SUM(remaining_amount)
            FROM customer_debts
            WHERE customer_id = NEW.customer_id
            AND status = 'active'
        ), 0)
        WHERE id = NEW.customer_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update customer's total debt
CREATE TRIGGER update_customer_debt_on_debt_change
    AFTER INSERT OR UPDATE OR DELETE ON customer_debts
    FOR EACH ROW EXECUTE FUNCTION update_customer_total_debt();

-- Function to update debt remaining amount after payment
CREATE OR REPLACE FUNCTION update_debt_after_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_debt_remaining INTEGER;
    v_installment_remaining INTEGER;
BEGIN
    -- Update the debt's remaining amount
    UPDATE customer_debts
    SET remaining_amount = remaining_amount - NEW.amount,
        status = CASE
            WHEN remaining_amount - NEW.amount <= 0 THEN 'paid'
            ELSE status
        END
    WHERE id = NEW.debt_id;

    -- If payment is for a specific installment, update it
    IF NEW.installment_id IS NOT NULL THEN
        UPDATE debt_installments
        SET paid_amount = paid_amount + NEW.amount,
            paid_date = CASE
                WHEN paid_amount + NEW.amount >= amount THEN CURRENT_DATE
                ELSE paid_date
            END,
            status = CASE
                WHEN paid_amount + NEW.amount >= amount THEN 'paid'
                WHEN paid_amount + NEW.amount > 0 THEN 'partial'
                ELSE status
            END
        WHERE id = NEW.installment_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update debt after payment
CREATE TRIGGER update_debt_on_payment
    AFTER INSERT ON debt_payments
    FOR EACH ROW EXECUTE FUNCTION update_debt_after_payment();

-- Function to check and update overdue debts (can be called by a scheduled job)
CREATE OR REPLACE FUNCTION update_overdue_debts()
RETURNS void AS $$
BEGIN
    -- Update credit debts that are past due date
    UPDATE customer_debts
    SET status = 'overdue'
    WHERE status = 'active'
    AND debt_type = 'credit'
    AND due_date < CURRENT_DATE;

    -- Update overdue installments
    UPDATE debt_installments
    SET status = 'overdue'
    WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE;

    -- Update installment debts where any installment is overdue
    UPDATE customer_debts cd
    SET status = 'overdue'
    WHERE cd.status = 'active'
    AND cd.debt_type = 'installment'
    AND EXISTS (
        SELECT 1 FROM debt_installments di
        WHERE di.debt_id = cd.id
        AND di.status = 'overdue'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. All new tables have RLS enabled
-- 2. Store-based isolation ensures customers only see their store's data
-- 3. Staff can create customers and debts (for POS operations)
-- 4. Only managers/owners can modify or delete records
-- 5. Debt payments can be created by all staff (for collecting payments)
-- 6. Triggers maintain data consistency for debt totals
-- 7. update_overdue_debts() should be called by a scheduled job (pg_cron or external)
