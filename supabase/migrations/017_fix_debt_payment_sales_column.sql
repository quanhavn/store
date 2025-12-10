-- Migration: Fix record_debt_payment function
-- Issue: Function references 'original_amount' column which doesn't exist in sales table
-- The sales table uses 'total' for the total amount, not 'original_amount'

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
    -- FIX: Use 'total' column instead of 'original_amount' (which doesn't exist)
    IF v_debt.sale_id IS NOT NULL THEN
        UPDATE sales
        SET payment_status = CASE WHEN v_new_remaining = 0 THEN 'paid' ELSE 'partial' END,
            amount_paid = total - v_new_remaining,
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
