-- Allow negative balance for cash and bank transactions
-- This enables stores to track actual outflows even when balance is insufficient

-- ============================================================================
-- UPDATE cash_out - Remove balance check
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

    -- Allow negative balance (removed check)
    v_new_balance := COALESCE(v_current_balance, 0) - p_amount;

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
-- UPDATE decrement_bank_balance - Remove balance check
-- ============================================================================
CREATE OR REPLACE FUNCTION decrement_bank_balance(
  p_bank_account_id UUID,
  p_store_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM bank_accounts
  WHERE id = p_bank_account_id
    AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;

  -- Allow negative balance (removed check)
  UPDATE bank_accounts
  SET balance = v_current_balance - p_amount
  WHERE id = p_bank_account_id
    AND store_id = p_store_id
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- ============================================================================
-- UPDATE create_expense (bank_transfer) - Remove balance check
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
        -- Get bank balance (no check, allow negative)
        SELECT COALESCE(balance, 0) INTO v_current_balance
        FROM bank_accounts
        WHERE id = p_bank_account_id AND store_id = p_store_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bank account not found';
        END IF;

        -- Update bank balance (allow negative)
        UPDATE bank_accounts
        SET balance = balance - p_amount
        WHERE id = p_bank_account_id AND store_id = p_store_id
        RETURNING balance INTO v_new_balance;

        -- Create bank book entry
        INSERT INTO bank_book (
            store_id, bank_account_id, description, reference_type, reference_id,
            debit, credit
        ) VALUES (
            p_store_id,
            p_bank_account_id,
            'Chi phí: ' || p_description,
            'expense',
            v_expense_id,
            0,
            p_amount
        );
    END IF;

    RETURN jsonb_build_object(
        'expense_id', v_expense_id,
        'balance', v_new_balance
    );
END;
$$;

-- Grant permissions (already granted, but ensure they exist)
GRANT EXECUTE ON FUNCTION cash_out(UUID, UUID, INTEGER, TEXT, VARCHAR, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION decrement_bank_balance(UUID, UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_expense(UUID, UUID, TEXT, INTEGER, VARCHAR, UUID, INTEGER, UUID, VARCHAR, VARCHAR, VARCHAR, DATE) TO authenticated, service_role;
