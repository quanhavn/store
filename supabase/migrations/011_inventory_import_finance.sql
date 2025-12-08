-- ============================================================================
-- INVENTORY: IMPORT STOCK WITH FINANCE INTEGRATION
-- ============================================================================
-- Atomically imports inventory and optionally records expense to cash/bank book
-- ============================================================================

-- First, update cash_book reference_type check constraint to allow 'inventory_import'
ALTER TABLE cash_book DROP CONSTRAINT IF EXISTS cash_book_reference_type_check;
ALTER TABLE cash_book ADD CONSTRAINT cash_book_reference_type_check 
  CHECK (reference_type IN ('sale', 'expense', 'adjustment', 'salary', 'debt_payment', 'inventory_import'));

CREATE OR REPLACE FUNCTION import_stock_with_expense(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_unit_cost INTEGER DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_record_expense BOOLEAN DEFAULT TRUE,
    p_payment_method VARCHAR DEFAULT 'cash',
    p_bank_account_id UUID DEFAULT NULL,
    p_supplier_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_new_quantity INTEGER;
    v_cost_to_record INTEGER;
    v_total_value INTEGER;
    v_log_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_cash_entry_id UUID;
    v_result JSONB;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    IF p_record_expense AND p_payment_method NOT IN ('cash', 'bank_transfer') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    IF p_record_expense AND p_payment_method = 'bank_transfer' AND p_bank_account_id IS NULL THEN
        RAISE EXCEPTION 'Bank account required for bank transfer';
    END IF;

    -- Get product with lock
    SELECT id, name, quantity, cost_price
    INTO v_product
    FROM products
    WHERE id = p_product_id
      AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- Calculate values
    v_cost_to_record := COALESCE(p_unit_cost, v_product.cost_price);
    v_new_quantity := v_product.quantity + p_quantity;
    v_total_value := p_quantity * v_cost_to_record;

    -- ========================================================================
    -- STEP 1: Update product quantity
    -- ========================================================================
    UPDATE products
    SET quantity = v_new_quantity,
        updated_at = NOW()
    WHERE id = p_product_id
      AND store_id = p_store_id;

    -- ========================================================================
    -- STEP 2: Create inventory log
    -- ========================================================================
    INSERT INTO inventory_logs (
        store_id, product_id, type, quantity,
        unit_cost, total_value, note, created_by
    ) VALUES (
        p_store_id, p_product_id, 'import', p_quantity,
        v_cost_to_record, v_total_value, p_note, p_user_id
    ) RETURNING id INTO v_log_id;

    -- ========================================================================
    -- STEP 3: Record expense if requested
    -- ========================================================================
    IF p_record_expense AND v_total_value > 0 THEN
        IF p_payment_method = 'cash' THEN
            -- Get current cash balance
            SELECT COALESCE(balance, 0) INTO v_current_balance
            FROM cash_book
            WHERE store_id = p_store_id
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE;

            v_new_balance := COALESCE(v_current_balance, 0) - v_total_value;

            INSERT INTO cash_book (
                store_id, description, reference_type, reference_id,
                debit, credit, balance, created_by
            ) VALUES (
                p_store_id,
                'Nhap kho: ' || v_product.name || COALESCE(' - ' || p_supplier_name, ''),
                'inventory_import',
                v_log_id,
                0,
                v_total_value,
                v_new_balance,
                p_user_id
            ) RETURNING id INTO v_cash_entry_id;

            -- Update inventory log with reference
            UPDATE inventory_logs
            SET reference_type = 'cash_book',
                reference_id = v_cash_entry_id
            WHERE id = v_log_id;

        ELSIF p_payment_method = 'bank_transfer' THEN
            -- Check bank balance first
            SELECT COALESCE(balance, 0) INTO v_current_balance
            FROM bank_accounts
            WHERE id = p_bank_account_id AND store_id = p_store_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Bank account not found';
            END IF;

            IF v_current_balance < v_total_value THEN
                RAISE EXCEPTION 'Insufficient bank balance';
            END IF;

            -- Update bank balance
            UPDATE bank_accounts
            SET balance = balance - v_total_value
            WHERE id = p_bank_account_id AND store_id = p_store_id
            RETURNING balance INTO v_new_balance;

            -- Create bank book entry
            INSERT INTO bank_book (
                store_id, bank_account_id, description, reference_type, reference_id,
                debit, credit
            ) VALUES (
                p_store_id, p_bank_account_id,
                'Nhap kho: ' || v_product.name || COALESCE(' - ' || p_supplier_name, ''),
                'inventory_import',
                v_log_id,
                0,
                v_total_value
            );
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 4: Build and return result
    -- ========================================================================
    SELECT jsonb_build_object(
        'log_id', v_log_id,
        'product_id', p_product_id,
        'product_name', v_product.name,
        'quantity_added', p_quantity,
        'new_quantity', v_new_quantity,
        'unit_cost', v_cost_to_record,
        'total_value', v_total_value,
        'expense_recorded', p_record_expense,
        'new_balance', v_new_balance
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION import_stock_with_expense(
    UUID, UUID, UUID, INTEGER, INTEGER, TEXT, BOOLEAN, VARCHAR, UUID, VARCHAR
) TO authenticated, service_role;
