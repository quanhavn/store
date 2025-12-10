-- ============================================================================
-- COMPLEX TRANSACTION RPC FUNCTIONS
-- ============================================================================
-- This migration creates RPC functions for complex multi-step transactions
-- that require atomicity. Each function handles all related operations
-- within a single database transaction.
--
-- Pattern:
--   - Simple queries: Direct client calls
--   - Complex logic with transactions: RPC functions (this file)
--   - 3rd party services: Edge functions
-- ============================================================================

-- ============================================================================
-- POS: CREATE SALE TRANSACTION
-- ============================================================================
-- Atomically creates a complete sale including:
-- - Sale record
-- - Sale items
-- - Payments
-- - Inventory updates
-- - Cash/bank book entries
-- - Debt creation (optional)
-- - Debt payment (optional)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_sale(
    p_store_id UUID,
    p_user_id UUID,
    p_items JSONB,  -- Array of {product_id, product_name, quantity, unit_price, vat_rate, discount}
    p_payments JSONB,  -- Array of {method, amount, bank_account_id?, bank_ref?}
    p_customer_id UUID DEFAULT NULL,
    p_customer_name VARCHAR DEFAULT NULL,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_customer_tax_code VARCHAR DEFAULT NULL,
    p_discount INTEGER DEFAULT 0,
    p_note TEXT DEFAULT NULL,
    p_create_debt BOOLEAN DEFAULT FALSE,
    p_debt_type VARCHAR DEFAULT NULL,  -- 'credit' or 'installment'
    p_debt_due_date DATE DEFAULT NULL,
    p_debt_installments INTEGER DEFAULT NULL,
    p_debt_frequency VARCHAR DEFAULT NULL,  -- 'weekly', 'biweekly', 'monthly'
    p_debt_first_due_date DATE DEFAULT NULL,
    p_debt_payment_amount INTEGER DEFAULT 0  -- Extra payment to reduce existing debt
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_payment JSONB;
    v_subtotal INTEGER := 0;
    v_vat_amount INTEGER := 0;
    v_total INTEGER;
    v_payment_total INTEGER := 0;
    v_amount_due INTEGER;
    v_payment_status VARCHAR(20);
    v_invoice_no VARCHAR(50);
    v_sale_id UUID;
    v_debt_id UUID;
    v_item_total INTEGER;
    v_item_vat INTEGER;
    v_product_qty INTEGER;
    v_new_qty INTEGER;
    v_current_cash_balance INTEGER;
    v_new_cash_balance INTEGER;
    v_installment_amounts INTEGER[];
    v_installment_dates DATE[];
    v_base_amount INTEGER;
    v_remainder INTEGER;
    v_due_date DATE;
    v_remaining_payment INTEGER;
    v_debt_amount_to_apply INTEGER;
    v_active_debt RECORD;
    v_result JSONB;
BEGIN
    -- ========================================================================
    -- STEP 1: Validate items and calculate totals
    -- ========================================================================
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::INTEGER
                        - COALESCE((v_item->>'discount')::INTEGER, 0);
        v_item_vat := v_item_total * COALESCE((v_item->>'vat_rate')::NUMERIC, 0) / 100;
        v_subtotal := v_subtotal + v_item_total;
        v_vat_amount := v_vat_amount + v_item_vat;
    END LOOP;

    v_total := v_subtotal + v_vat_amount - p_discount;

    -- Calculate payment total
    IF p_payments IS NOT NULL THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
        LOOP
            v_payment_total := v_payment_total + (v_payment->>'amount')::INTEGER;
        END LOOP;
    END IF;

    v_amount_due := v_total - v_payment_total;

    -- ========================================================================
    -- STEP 2: Validate payment and debt requirements
    -- ========================================================================
    IF v_payment_total < v_total THEN
        IF NOT p_create_debt THEN
            RAISE EXCEPTION 'Payment amount insufficient. Missing % VND', v_amount_due;
        END IF;
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Customer required for debt creation';
        END IF;
        IF p_debt_type NOT IN ('credit', 'installment') THEN
            RAISE EXCEPTION 'Invalid debt type';
        END IF;
        IF p_debt_type = 'installment' THEN
            IF p_debt_installments < 2 OR p_debt_installments > 12 THEN
                RAISE EXCEPTION 'Installments must be between 2 and 12';
            END IF;
            IF p_debt_frequency NOT IN ('weekly', 'biweekly', 'monthly') THEN
                RAISE EXCEPTION 'Invalid installment frequency';
            END IF;
            IF p_debt_first_due_date IS NULL THEN
                RAISE EXCEPTION 'First due date required for installments';
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 3: Validate stock availability
    -- ========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT quantity INTO v_product_qty
        FROM products
        WHERE id = (v_item->>'product_id')::UUID
          AND store_id = p_store_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found: %', v_item->>'product_name';
        END IF;

        IF v_product_qty < (v_item->>'quantity')::INTEGER THEN
            RAISE EXCEPTION 'Insufficient stock for %: only % available',
                v_item->>'product_name', v_product_qty;
        END IF;
    END LOOP;

    -- ========================================================================
    -- STEP 4: Generate invoice number
    -- ========================================================================
    SELECT 'HD' || to_char(NOW(), 'YYYYMM') ||
           LPAD(COALESCE(
               (SELECT (SUBSTRING(invoice_no FROM 9)::INTEGER + 1)
                FROM sales
                WHERE store_id = p_store_id
                  AND invoice_no LIKE 'HD' || to_char(NOW(), 'YYYYMM') || '%'
                ORDER BY invoice_no DESC
                LIMIT 1),
               1)::TEXT, 4, '0')
    INTO v_invoice_no;

    -- Determine payment status
    IF v_payment_total = 0 THEN
        v_payment_status := 'unpaid';
    ELSIF v_payment_total < v_total THEN
        v_payment_status := 'partial';
    ELSE
        v_payment_status := 'paid';
    END IF;

    -- ========================================================================
    -- STEP 5: Create sale record
    -- ========================================================================
    INSERT INTO sales (
        store_id, user_id, invoice_no, subtotal, vat_amount, discount, total,
        status, payment_status, amount_paid, amount_due,
        customer_id, customer_name, customer_phone, customer_tax_code,
        note, completed_at
    ) VALUES (
        p_store_id, p_user_id, v_invoice_no, v_subtotal, v_vat_amount, p_discount, v_total,
        'completed', v_payment_status, v_payment_total,
        CASE WHEN v_amount_due > 0 THEN v_amount_due ELSE 0 END,
        p_customer_id, p_customer_name, p_customer_phone, p_customer_tax_code,
        p_note, NOW()
    ) RETURNING id INTO v_sale_id;

    -- ========================================================================
    -- STEP 6: Create sale items
    -- ========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::INTEGER
                        - COALESCE((v_item->>'discount')::INTEGER, 0);
        v_item_vat := v_item_total * COALESCE((v_item->>'vat_rate')::NUMERIC, 0) / 100;

        INSERT INTO sale_items (
            sale_id, product_id, product_name, quantity, unit_price,
            vat_rate, vat_amount, discount, total
        ) VALUES (
            v_sale_id,
            (v_item->>'product_id')::UUID,
            v_item->>'product_name',
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::INTEGER,
            COALESCE((v_item->>'vat_rate')::NUMERIC, 0),
            v_item_vat,
            COALESCE((v_item->>'discount')::INTEGER, 0),
            v_item_total
        );
    END LOOP;

    -- ========================================================================
    -- STEP 7: Create payment records
    -- ========================================================================
    IF p_payments IS NOT NULL THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
        LOOP
            INSERT INTO payments (
                sale_id, method, amount, bank_account_id, bank_ref
            ) VALUES (
                v_sale_id,
                v_payment->>'method',
                (v_payment->>'amount')::INTEGER,
                (v_payment->>'bank_account_id')::UUID,
                v_payment->>'bank_ref'
            );
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 8: Update product quantities and create inventory logs
    -- ========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE products
        SET quantity = quantity - (v_item->>'quantity')::INTEGER
        WHERE id = (v_item->>'product_id')::UUID
          AND store_id = p_store_id;

        INSERT INTO inventory_logs (
            store_id, product_id, type, quantity,
            reference_type, reference_id, created_by
        ) VALUES (
            p_store_id,
            (v_item->>'product_id')::UUID,
            'sale',
            -(v_item->>'quantity')::INTEGER,
            'sale',
            v_sale_id,
            p_user_id
        );
    END LOOP;

    -- ========================================================================
    -- STEP 9: Record to cash/bank book
    -- ========================================================================
    IF p_payments IS NOT NULL THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
        LOOP
            IF v_payment->>'method' = 'cash' THEN
                -- Get current cash balance
                SELECT COALESCE(balance, 0) INTO v_current_cash_balance
                FROM cash_book
                WHERE store_id = p_store_id
                ORDER BY created_at DESC
                LIMIT 1;

                v_new_cash_balance := COALESCE(v_current_cash_balance, 0) + (v_payment->>'amount')::INTEGER;

                INSERT INTO cash_book (
                    store_id, description, reference_type, reference_id,
                    debit, credit, balance, created_by
                ) VALUES (
                    p_store_id,
                    'Ban hang - ' || v_invoice_no,
                    'sale',
                    v_sale_id,
                    (v_payment->>'amount')::INTEGER,
                    0,
                    v_new_cash_balance,
                    p_user_id
                );

            ELSIF v_payment->>'method' = 'bank_transfer' AND v_payment->>'bank_account_id' IS NOT NULL THEN
                -- Atomically update bank balance
                UPDATE bank_accounts
                SET balance = COALESCE(balance, 0) + (v_payment->>'amount')::INTEGER
                WHERE id = (v_payment->>'bank_account_id')::UUID
                  AND store_id = p_store_id;

                INSERT INTO bank_book (
                    store_id, bank_account_id, description, reference_type, reference_id,
                    debit, credit, bank_ref
                ) VALUES (
                    p_store_id,
                    (v_payment->>'bank_account_id')::UUID,
                    'Ban hang - ' || v_invoice_no,
                    'sale',
                    v_sale_id,
                    (v_payment->>'amount')::INTEGER,
                    0,
                    v_payment->>'bank_ref'
                );
            END IF;
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 10: Create debt record if needed
    -- ========================================================================
    IF p_create_debt AND v_amount_due > 0 AND p_customer_id IS NOT NULL THEN
        IF p_debt_type = 'credit' THEN
            -- Default due date is 30 days from now
            v_due_date := COALESCE(p_debt_due_date, CURRENT_DATE + INTERVAL '30 days');

            INSERT INTO customer_debts (
                store_id, customer_id, sale_id, debt_type,
                original_amount, remaining_amount, due_date,
                notes, status, created_by
            ) VALUES (
                p_store_id, p_customer_id, v_sale_id, 'credit',
                v_amount_due, v_amount_due, v_due_date,
                'Cong no tu don hang ' || v_invoice_no,
                'active', p_user_id
            ) RETURNING id INTO v_debt_id;

        ELSIF p_debt_type = 'installment' THEN
            INSERT INTO customer_debts (
                store_id, customer_id, sale_id, debt_type,
                original_amount, remaining_amount, due_date,
                notes, status, created_by
            ) VALUES (
                p_store_id, p_customer_id, v_sale_id, 'installment',
                v_amount_due, v_amount_due, NULL,
                'Cong no tra gop tu don hang ' || v_invoice_no,
                'active', p_user_id
            ) RETURNING id INTO v_debt_id;

            -- Calculate installment amounts (divide evenly, last takes remainder)
            v_base_amount := v_amount_due / p_debt_installments;
            v_remainder := v_amount_due - (v_base_amount * p_debt_installments);

            -- Create installment records
            FOR i IN 1..p_debt_installments
            LOOP
                -- Calculate due date based on frequency
                CASE p_debt_frequency
                    WHEN 'weekly' THEN
                        v_due_date := p_debt_first_due_date + ((i - 1) * 7);
                    WHEN 'biweekly' THEN
                        v_due_date := p_debt_first_due_date + ((i - 1) * 14);
                    WHEN 'monthly' THEN
                        v_due_date := p_debt_first_due_date + ((i - 1) * INTERVAL '1 month');
                END CASE;

                INSERT INTO debt_installments (
                    debt_id, installment_number, amount, due_date,
                    paid_amount, status
                ) VALUES (
                    v_debt_id,
                    i,
                    CASE WHEN i = p_debt_installments THEN v_base_amount + v_remainder ELSE v_base_amount END,
                    v_due_date,
                    0,
                    'pending'
                );
            END LOOP;
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 11: Handle debt payment (pay extra to reduce existing debt)
    -- ========================================================================
    IF p_debt_payment_amount > 0 AND p_customer_id IS NOT NULL THEN
        v_remaining_payment := p_debt_payment_amount;

        -- Get oldest active debts for this customer
        FOR v_active_debt IN
            SELECT id, remaining_amount
            FROM customer_debts
            WHERE customer_id = p_customer_id
              AND store_id = p_store_id
              AND status IN ('active', 'overdue')
            ORDER BY created_at ASC
        LOOP
            IF v_remaining_payment <= 0 THEN
                EXIT;
            END IF;

            v_debt_amount_to_apply := LEAST(v_remaining_payment, v_active_debt.remaining_amount);

            -- Create debt payment record (trigger will update remaining_amount)
            INSERT INTO debt_payments (
                store_id, debt_id, amount, payment_method, notes, created_by
            ) VALUES (
                p_store_id, v_active_debt.id, v_debt_amount_to_apply,
                'cash', 'Thanh toan khi mua hang - ' || v_invoice_no, p_user_id
            );

            -- Get current cash balance for the payment
            SELECT COALESCE(balance, 0) INTO v_current_cash_balance
            FROM cash_book
            WHERE store_id = p_store_id
            ORDER BY created_at DESC
            LIMIT 1;

            v_new_cash_balance := COALESCE(v_current_cash_balance, 0) + v_debt_amount_to_apply;

            INSERT INTO cash_book (
                store_id, description, reference_type, reference_id,
                debit, credit, balance, created_by
            ) VALUES (
                p_store_id,
                'Thu no tai quay - ' || v_invoice_no,
                'debt_payment',
                v_active_debt.id,
                v_debt_amount_to_apply,
                0,
                v_new_cash_balance,
                p_user_id
            );

            v_remaining_payment := v_remaining_payment - v_debt_amount_to_apply;
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 12: Build and return result
    -- ========================================================================
    SELECT jsonb_build_object(
        'sale_id', v_sale_id,
        'invoice_no', v_invoice_no,
        'total', v_total,
        'payment_status', v_payment_status,
        'amount_paid', v_payment_total,
        'amount_due', CASE WHEN v_amount_due > 0 THEN v_amount_due ELSE 0 END,
        'debt_id', v_debt_id
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- FINANCE: CREATE EXPENSE TRANSACTION
-- ============================================================================
-- Atomically creates an expense with cash/bank book entry
-- ============================================================================

CREATE OR REPLACE FUNCTION create_expense(
    p_store_id UUID,
    p_user_id UUID,
    p_description TEXT,
    p_amount INTEGER,
    p_payment_method VARCHAR,
    p_category_id UUID DEFAULT NULL,
    p_vat_amount INTEGER DEFAULT 0,
    p_bank_account_id UUID DEFAULT NULL,
    p_invoice_no VARCHAR DEFAULT NULL,
    p_supplier_name VARCHAR DEFAULT NULL,
    p_supplier_tax_code VARCHAR DEFAULT NULL,
    p_expense_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expense_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_result JSONB;
BEGIN
    -- Validate payment method
    IF p_payment_method NOT IN ('cash', 'bank_transfer') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    IF p_payment_method = 'bank_transfer' AND p_bank_account_id IS NULL THEN
        RAISE EXCEPTION 'Bank account required for bank transfer';
    END IF;

    -- Create expense record
    INSERT INTO expenses (
        store_id, category_id, description, amount, vat_amount,
        payment_method, bank_account_id, invoice_no,
        supplier_name, supplier_tax_code,
        expense_date, created_by
    ) VALUES (
        p_store_id, p_category_id, p_description, p_amount, p_vat_amount,
        p_payment_method, p_bank_account_id, p_invoice_no,
        p_supplier_name, p_supplier_tax_code,
        COALESCE(p_expense_date, CURRENT_DATE), p_user_id
    ) RETURNING id INTO v_expense_id;

    -- Record to cash/bank book
    IF p_payment_method = 'cash' THEN
        -- Get current cash balance
        SELECT COALESCE(balance, 0) INTO v_current_balance
        FROM cash_book
        WHERE store_id = p_store_id
        ORDER BY created_at DESC
        LIMIT 1;

        v_new_balance := COALESCE(v_current_balance, 0) - p_amount;

        INSERT INTO cash_book (
            store_id, description, reference_type, reference_id,
            debit, credit, balance, created_by
        ) VALUES (
            p_store_id,
            'Chi phí: ' || p_description,
            'expense',
            v_expense_id,
            0,
            p_amount,
            v_new_balance,
            p_user_id
        );

    ELSIF p_payment_method = 'bank_transfer' THEN
        -- Check bank balance first
        SELECT COALESCE(balance, 0) INTO v_current_balance
        FROM bank_accounts
        WHERE id = p_bank_account_id AND store_id = p_store_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bank account not found';
        END IF;

        IF v_current_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient bank balance';
        END IF;

        -- Update bank balance
        UPDATE bank_accounts
        SET balance = balance - p_amount
        WHERE id = p_bank_account_id AND store_id = p_store_id
        RETURNING balance INTO v_new_balance;

        -- Create bank book entry
        INSERT INTO bank_book (
            store_id, bank_account_id, description, reference_type, reference_id,
            debit, credit
        ) VALUES (
            p_store_id, p_bank_account_id,
            'Chi phí: ' || p_description,
            'expense',
            v_expense_id,
            0,
            p_amount
        );
    END IF;

    SELECT jsonb_build_object(
        'expense_id', v_expense_id,
        'amount', p_amount,
        'new_balance', v_new_balance
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- DEBT: RECORD PAYMENT TRANSACTION
-- ============================================================================
-- Atomically records a debt payment with all related updates
-- ============================================================================

CREATE OR REPLACE FUNCTION record_debt_payment(
    p_store_id UUID,
    p_user_id UUID,
    p_debt_id UUID,
    p_amount INTEGER,
    p_payment_method VARCHAR,
    p_installment_id UUID DEFAULT NULL,
    p_bank_account_id UUID DEFAULT NULL,
    p_bank_ref VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_debt RECORD;
    v_installment RECORD;
    v_payment_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_new_remaining INTEGER;
    v_installment_remaining INTEGER;
    v_customer_name VARCHAR;
    v_result JSONB;
BEGIN
    -- Validate payment method
    IF p_payment_method NOT IN ('cash', 'bank_transfer') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    IF p_payment_method = 'bank_transfer' AND p_bank_account_id IS NULL THEN
        RAISE EXCEPTION 'Bank account required for bank transfer';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    -- Get debt details with lock
    SELECT cd.*, c.name as customer_name
    INTO v_debt
    FROM customer_debts cd
    JOIN customers c ON c.id = cd.customer_id
    WHERE cd.id = p_debt_id
      AND cd.store_id = p_store_id
    FOR UPDATE OF cd;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Debt not found';
    END IF;

    IF v_debt.status = 'paid' THEN
        RAISE EXCEPTION 'Debt already fully paid';
    END IF;

    IF v_debt.status = 'cancelled' THEN
        RAISE EXCEPTION 'Debt has been cancelled';
    END IF;

    IF p_amount > v_debt.remaining_amount THEN
        RAISE EXCEPTION 'Payment amount exceeds remaining debt (% VND)', v_debt.remaining_amount;
    END IF;

    v_customer_name := v_debt.customer_name;

    -- If installment payment, validate installment
    IF p_installment_id IS NOT NULL THEN
        SELECT * INTO v_installment
        FROM debt_installments
        WHERE id = p_installment_id
          AND debt_id = p_debt_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Installment not found';
        END IF;

        v_installment_remaining := v_installment.amount - v_installment.paid_amount;
        IF p_amount > v_installment_remaining THEN
            RAISE EXCEPTION 'Payment exceeds installment remaining (% VND)', v_installment_remaining;
        END IF;
    END IF;

    -- Create debt payment record
    -- Note: The database trigger will update remaining_amount and status
    INSERT INTO debt_payments (
        store_id, debt_id, installment_id, amount,
        payment_method, bank_account_id, bank_ref, notes, created_by
    ) VALUES (
        p_store_id, p_debt_id, p_installment_id, p_amount,
        p_payment_method, p_bank_account_id, p_bank_ref, p_notes, p_user_id
    ) RETURNING id INTO v_payment_id;

    -- Record to cash/bank book
    IF p_payment_method = 'cash' THEN
        -- Get current cash balance
        SELECT COALESCE(balance, 0) INTO v_current_balance
        FROM cash_book
        WHERE store_id = p_store_id
        ORDER BY created_at DESC
        LIMIT 1;

        v_new_balance := COALESCE(v_current_balance, 0) + p_amount;

        INSERT INTO cash_book (
            store_id, description, reference_type, reference_id,
            debit, credit, balance, created_by
        ) VALUES (
            p_store_id,
            'Thu no: ' || v_customer_name,
            'debt_payment',
            v_payment_id,
            p_amount,
            0,
            v_new_balance,
            p_user_id
        );

    ELSIF p_payment_method = 'bank_transfer' THEN
        -- Atomically update bank balance
        UPDATE bank_accounts
        SET balance = COALESCE(balance, 0) + p_amount
        WHERE id = p_bank_account_id AND store_id = p_store_id
        RETURNING balance INTO v_new_balance;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bank account not found';
        END IF;

        INSERT INTO bank_book (
            store_id, bank_account_id, description, reference_type, reference_id,
            debit, credit, bank_ref
        ) VALUES (
            p_store_id, p_bank_account_id,
            'Thu no: ' || v_customer_name,
            'debt_payment',
            v_payment_id,
            p_amount,
            0,
            p_bank_ref
        );
    END IF;

    -- Get updated debt info
    SELECT remaining_amount INTO v_new_remaining
    FROM customer_debts
    WHERE id = p_debt_id;

    -- If linked to a sale, update sale payment status
    IF v_debt.sale_id IS NOT NULL THEN
        UPDATE sales
        SET payment_status = CASE WHEN v_new_remaining = 0 THEN 'paid' ELSE 'partial' END,
            amount_paid = original_amount - v_new_remaining,
            amount_due = v_new_remaining
        WHERE id = v_debt.sale_id
          AND store_id = p_store_id;
    END IF;

    SELECT jsonb_build_object(
        'payment_id', v_payment_id,
        'amount', p_amount,
        'remaining_amount', v_new_remaining,
        'is_fully_paid', v_new_remaining = 0,
        'new_balance', v_new_balance
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- FINANCE: CASH IN TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cash_in(
    p_store_id UUID,
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_entry_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Get current balance
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM cash_book
    WHERE store_id = p_store_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_new_balance := COALESCE(v_current_balance, 0) + p_amount;

    INSERT INTO cash_book (
        store_id, description, reference_type, reference_id,
        debit, credit, balance, created_by
    ) VALUES (
        p_store_id, p_description, p_reference_type, p_reference_id,
        p_amount, 0, v_new_balance, p_user_id
    ) RETURNING id INTO v_entry_id;

    RETURN jsonb_build_object(
        'entry_id', v_entry_id,
        'balance', v_new_balance
    );
END;
$$;

-- ============================================================================
-- FINANCE: CASH OUT TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cash_out(
    p_store_id UUID,
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_entry_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Get current balance with lock
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM cash_book
    WHERE store_id = p_store_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient cash balance';
    END IF;

    v_new_balance := v_current_balance - p_amount;

    INSERT INTO cash_book (
        store_id, description, reference_type, reference_id,
        debit, credit, balance, created_by
    ) VALUES (
        p_store_id, p_description, p_reference_type, p_reference_id,
        0, p_amount, v_new_balance, p_user_id
    ) RETURNING id INTO v_entry_id;

    RETURN jsonb_build_object(
        'entry_id', v_entry_id,
        'balance', v_new_balance
    );
END;
$$;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_sale(
    UUID, UUID, JSONB, JSONB, UUID, VARCHAR, VARCHAR, VARCHAR, INTEGER, TEXT,
    BOOLEAN, VARCHAR, DATE, INTEGER, VARCHAR, DATE, INTEGER
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION create_expense(
    UUID, UUID, TEXT, INTEGER, VARCHAR, UUID, INTEGER, UUID, VARCHAR, VARCHAR, VARCHAR, DATE
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION record_debt_payment(
    UUID, UUID, UUID, INTEGER, VARCHAR, UUID, UUID, VARCHAR, TEXT
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION cash_in(
    UUID, UUID, INTEGER, TEXT, VARCHAR, UUID
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION cash_out(
    UUID, UUID, INTEGER, TEXT, VARCHAR, UUID
) TO authenticated, service_role;
