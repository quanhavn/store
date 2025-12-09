-- Migration: Update create_sale RPC to support variants and units
-- This enables:
-- 1. Storing variant_id and unit_id in sale_items
-- 2. Deducting stock from product_variants when variant_id is provided
-- 3. Proper unit handling with conversion_rate

-- ============================================================================
-- UPDATE create_sale FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_sale(
    p_store_id UUID,
    p_user_id UUID,
    p_items JSONB,  -- Array of {product_id, product_name, quantity, unit_price, vat_rate, discount, variant_id?, variant_name?, unit_id?, unit_name?, conversion_rate?}
    p_payments JSONB,  -- Array of {method, amount, bank_account_id?, bank_ref?}
    p_customer_id UUID DEFAULT NULL,
    p_customer_name VARCHAR DEFAULT NULL,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_customer_tax_code VARCHAR DEFAULT NULL,
    p_discount INTEGER DEFAULT 0,
    p_note TEXT DEFAULT NULL,
    p_create_debt BOOLEAN DEFAULT FALSE,
    p_debt_type VARCHAR DEFAULT NULL,
    p_debt_due_date DATE DEFAULT NULL,
    p_debt_installments INTEGER DEFAULT NULL,
    p_debt_frequency VARCHAR DEFAULT NULL,
    p_debt_first_due_date DATE DEFAULT NULL,
    p_debt_payment_amount INTEGER DEFAULT 0
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
    v_variant_qty INTEGER;
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
    v_has_variant BOOLEAN;
    v_variant_id UUID;
    v_base_quantity INTEGER;
    v_conversion_rate NUMERIC;
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
    -- STEP 3: Validate stock availability (check variant stock if variant_id provided)
    -- ========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_has_variant := (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '';
        v_conversion_rate := COALESCE((v_item->>'conversion_rate')::NUMERIC, 1);
        v_base_quantity := CEIL((v_item->>'quantity')::INTEGER * v_conversion_rate)::INTEGER;
        
        IF v_has_variant THEN
            -- Check variant stock
            SELECT quantity INTO v_variant_qty
            FROM product_variants
            WHERE id = (v_item->>'variant_id')::UUID
              AND product_id = (v_item->>'product_id')::UUID
              AND active = true;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant not found: %', COALESCE(v_item->>'variant_name', v_item->>'product_name');
            END IF;
            
            IF v_variant_qty < v_base_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for % - %: only % available',
                    v_item->>'product_name', v_item->>'variant_name', v_variant_qty;
            END IF;
        ELSE
            -- Check product stock
            SELECT quantity INTO v_product_qty
            FROM products
            WHERE id = (v_item->>'product_id')::UUID
              AND store_id = p_store_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product not found: %', v_item->>'product_name';
            END IF;

            IF v_product_qty < v_base_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for %: only % available',
                    v_item->>'product_name', v_product_qty;
            END IF;
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
    -- STEP 6: Create sale items (with variant_id and unit_id)
    -- ========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::INTEGER
                        - COALESCE((v_item->>'discount')::INTEGER, 0);
        v_item_vat := v_item_total * COALESCE((v_item->>'vat_rate')::NUMERIC, 0) / 100;

        INSERT INTO sale_items (
            sale_id, product_id, product_name, quantity, unit_price,
            vat_rate, vat_amount, discount, total,
            variant_id, unit_id, unit_name
        ) VALUES (
            v_sale_id,
            (v_item->>'product_id')::UUID,
            v_item->>'product_name',
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::INTEGER,
            COALESCE((v_item->>'vat_rate')::NUMERIC, 0),
            v_item_vat,
            COALESCE((v_item->>'discount')::INTEGER, 0),
            v_item_total,
            NULLIF(v_item->>'variant_id', '')::UUID,
            NULLIF(v_item->>'unit_id', '')::UUID,
            NULLIF(v_item->>'unit_name', '')
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
    -- STEP 8: Update product/variant quantities and create inventory logs
    -- ========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_has_variant := (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '';
        v_conversion_rate := COALESCE((v_item->>'conversion_rate')::NUMERIC, 1);
        v_base_quantity := CEIL((v_item->>'quantity')::INTEGER * v_conversion_rate)::INTEGER;
        
        IF v_has_variant THEN
            -- Deduct from variant stock
            UPDATE product_variants
            SET quantity = quantity - v_base_quantity,
                updated_at = NOW()
            WHERE id = (v_item->>'variant_id')::UUID;
            
            -- Create inventory log with variant_id
            INSERT INTO inventory_logs (
                store_id, product_id, variant_id, type, quantity,
                reference_type, reference_id, created_by
            ) VALUES (
                p_store_id,
                (v_item->>'product_id')::UUID,
                (v_item->>'variant_id')::UUID,
                'sale',
                -v_base_quantity,
                'sales',
                v_sale_id,
                p_user_id
            );
        ELSE
            -- Deduct from product stock
            UPDATE products
            SET quantity = quantity - v_base_quantity
            WHERE id = (v_item->>'product_id')::UUID
              AND store_id = p_store_id;

            INSERT INTO inventory_logs (
                store_id, product_id, type, quantity,
                reference_type, reference_id, created_by
            ) VALUES (
                p_store_id,
                (v_item->>'product_id')::UUID,
                'sale',
                -v_base_quantity,
                'sales',
                v_sale_id,
                p_user_id
            );
        END IF;
    END LOOP;

    -- ========================================================================
    -- STEP 9: Create cash book entries for cash payments
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
                    'Bán hàng ' || v_invoice_no,
                    'sale', v_sale_id,
                    (v_payment->>'amount')::INTEGER, 0, v_new_cash_balance,
                    p_user_id
                );
            END IF;

            -- Handle bank transfer
            IF v_payment->>'method' = 'bank_transfer' AND (v_payment->>'bank_account_id') IS NOT NULL THEN
                UPDATE bank_accounts
                SET balance = balance + (v_payment->>'amount')::INTEGER
                WHERE id = (v_payment->>'bank_account_id')::UUID;
            END IF;
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 10: Create debt if applicable (same as before)
    -- ========================================================================
    IF p_create_debt AND v_amount_due > 0 THEN
        IF p_debt_type = 'credit' THEN
            INSERT INTO customer_debts (
                store_id, customer_id, sale_id, debt_type,
                original_amount, remaining_amount, due_date, status
            ) VALUES (
                p_store_id, p_customer_id, v_sale_id, 'credit',
                v_amount_due, v_amount_due,
                COALESCE(p_debt_due_date, CURRENT_DATE + 30),
                'active'
            ) RETURNING id INTO v_debt_id;
        ELSE
            INSERT INTO customer_debts (
                store_id, customer_id, sale_id, debt_type,
                original_amount, remaining_amount, status
            ) VALUES (
                p_store_id, p_customer_id, v_sale_id, 'installment',
                v_amount_due, v_amount_due, 'active'
            ) RETURNING id INTO v_debt_id;

            v_base_amount := v_amount_due / p_debt_installments;
            v_remainder := v_amount_due - (v_base_amount * p_debt_installments);

            FOR i IN 1..p_debt_installments LOOP
                IF p_debt_frequency = 'weekly' THEN
                    v_due_date := p_debt_first_due_date + ((i - 1) * 7);
                ELSIF p_debt_frequency = 'biweekly' THEN
                    v_due_date := p_debt_first_due_date + ((i - 1) * 14);
                ELSE
                    v_due_date := p_debt_first_due_date + ((i - 1) || ' months')::INTERVAL;
                END IF;

                INSERT INTO debt_installments (
                    debt_id, installment_number, due_date,
                    amount, remaining_amount, status
                ) VALUES (
                    v_debt_id, i, v_due_date,
                    CASE WHEN i = p_debt_installments THEN v_base_amount + v_remainder ELSE v_base_amount END,
                    CASE WHEN i = p_debt_installments THEN v_base_amount + v_remainder ELSE v_base_amount END,
                    'pending'
                );
            END LOOP;
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 11: Apply debt payment if applicable (same as before)
    -- ========================================================================
    IF p_debt_payment_amount > 0 AND p_customer_id IS NOT NULL THEN
        v_remaining_payment := p_debt_payment_amount;

        FOR v_active_debt IN
            SELECT cd.id, cd.remaining_amount, cd.debt_type
            FROM customer_debts cd
            WHERE cd.customer_id = p_customer_id
              AND cd.store_id = p_store_id
              AND cd.status = 'active'
              AND cd.remaining_amount > 0
            ORDER BY cd.created_at ASC
        LOOP
            EXIT WHEN v_remaining_payment <= 0;

            v_debt_amount_to_apply := LEAST(v_remaining_payment, v_active_debt.remaining_amount);
            v_remaining_payment := v_remaining_payment - v_debt_amount_to_apply;

            UPDATE customer_debts
            SET remaining_amount = remaining_amount - v_debt_amount_to_apply,
                status = CASE WHEN remaining_amount - v_debt_amount_to_apply <= 0 THEN 'paid' ELSE status END,
                updated_at = NOW()
            WHERE id = v_active_debt.id;

            INSERT INTO debt_payments (
                debt_id, amount, payment_method, note, created_by
            ) VALUES (
                v_active_debt.id, v_debt_amount_to_apply, 'cash',
                'Thanh toán từ đơn hàng ' || v_invoice_no, p_user_id
            );

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
                'Thu nợ từ đơn hàng ' || v_invoice_no,
                'debt_payment', v_active_debt.id,
                v_debt_amount_to_apply, 0, v_new_cash_balance,
                p_user_id
            );
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 12: Return result
    -- ========================================================================
    v_result := jsonb_build_object(
        'sale_id', v_sale_id,
        'invoice_no', v_invoice_no,
        'total', v_total,
        'payment_status', v_payment_status,
        'debt_id', v_debt_id
    );

    IF p_debt_payment_amount > 0 THEN
        v_result := v_result || jsonb_build_object('debt_payment_applied', p_debt_payment_amount - COALESCE(v_remaining_payment, 0));
    END IF;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- UPDATE inventory import/export/adjust FUNCTIONS
-- ============================================================================

-- Import stock function with variant support
CREATE OR REPLACE FUNCTION import_stock_with_variant(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_unit_cost INTEGER DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_record_expense BOOLEAN DEFAULT FALSE,
    p_payment_method VARCHAR DEFAULT 'cash',
    p_bank_account_id UUID DEFAULT NULL,
    p_supplier_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_qty INTEGER;
    v_total_cost INTEGER;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_inventory_log_id UUID;
BEGIN
    v_total_cost := COALESCE(p_unit_cost, 0) * p_quantity;
    
    IF p_variant_id IS NOT NULL THEN
        -- Update variant stock
        UPDATE product_variants
        SET quantity = quantity + p_quantity,
            cost_price = COALESCE(p_unit_cost, cost_price),
            updated_at = NOW()
        WHERE id = p_variant_id
          AND product_id = p_product_id
        RETURNING quantity INTO v_new_qty;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variant not found';
        END IF;
    ELSE
        -- Update product stock
        UPDATE products
        SET quantity = quantity + p_quantity,
            cost_price = COALESCE(p_unit_cost, cost_price)
        WHERE id = p_product_id
          AND store_id = p_store_id
        RETURNING quantity INTO v_new_qty;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found';
        END IF;
    END IF;
    
    -- Create inventory log
    INSERT INTO inventory_logs (
        store_id, product_id, variant_id, type, quantity,
        unit_cost, total_cost, note, created_by
    ) VALUES (
        p_store_id, p_product_id, p_variant_id, 'import', p_quantity,
        p_unit_cost, v_total_cost, p_note, p_user_id
    ) RETURNING id INTO v_inventory_log_id;
    
    -- Record expense if requested
    IF p_record_expense AND v_total_cost > 0 THEN
        IF p_payment_method = 'cash' THEN
            SELECT COALESCE(balance, 0) INTO v_current_balance
            FROM cash_book
            WHERE store_id = p_store_id
            ORDER BY created_at DESC
            LIMIT 1;
            
            v_new_balance := COALESCE(v_current_balance, 0) - v_total_cost;
            
            INSERT INTO cash_book (
                store_id, description, reference_type, reference_id,
                debit, credit, balance, created_by
            ) VALUES (
                p_store_id,
                'Nhập hàng' || COALESCE(' - ' || p_supplier_name, ''),
                'inventory_import', v_inventory_log_id,
                0, v_total_cost, v_new_balance,
                p_user_id
            );
        ELSIF p_payment_method = 'bank_transfer' AND p_bank_account_id IS NOT NULL THEN
            UPDATE bank_accounts
            SET balance = balance - v_total_cost
            WHERE id = p_bank_account_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'new_quantity', v_new_qty,
        'inventory_log_id', v_inventory_log_id
    );
END;
$$;

-- Export stock function with variant support
CREATE OR REPLACE FUNCTION export_stock_with_variant(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_qty INTEGER;
    v_new_qty INTEGER;
    v_inventory_log_id UUID;
BEGIN
    IF p_variant_id IS NOT NULL THEN
        -- Check and update variant stock
        SELECT quantity INTO v_current_qty
        FROM product_variants
        WHERE id = p_variant_id
          AND product_id = p_product_id
          AND active = true;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variant not found';
        END IF;
        
        IF v_current_qty < p_quantity THEN
            RAISE EXCEPTION 'Insufficient stock: only % available', v_current_qty;
        END IF;
        
        UPDATE product_variants
        SET quantity = quantity - p_quantity,
            updated_at = NOW()
        WHERE id = p_variant_id
        RETURNING quantity INTO v_new_qty;
    ELSE
        -- Check and update product stock
        SELECT quantity INTO v_current_qty
        FROM products
        WHERE id = p_product_id
          AND store_id = p_store_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found';
        END IF;
        
        IF v_current_qty < p_quantity THEN
            RAISE EXCEPTION 'Insufficient stock: only % available', v_current_qty;
        END IF;
        
        UPDATE products
        SET quantity = quantity - p_quantity
        WHERE id = p_product_id
          AND store_id = p_store_id
        RETURNING quantity INTO v_new_qty;
    END IF;
    
    -- Create inventory log
    INSERT INTO inventory_logs (
        store_id, product_id, variant_id, type, quantity, note, created_by
    ) VALUES (
        p_store_id, p_product_id, p_variant_id, 'export', -p_quantity, p_note, p_user_id
    ) RETURNING id INTO v_inventory_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'new_quantity', v_new_qty,
        'inventory_log_id', v_inventory_log_id
    );
END;
$$;

-- Adjust stock function with variant support  
CREATE OR REPLACE FUNCTION adjust_stock_with_variant(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_new_quantity INTEGER DEFAULT 0,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_qty INTEGER;
    v_difference INTEGER;
    v_inventory_log_id UUID;
BEGIN
    IF p_variant_id IS NOT NULL THEN
        -- Get and update variant stock
        SELECT quantity INTO v_current_qty
        FROM product_variants
        WHERE id = p_variant_id
          AND product_id = p_product_id
          AND active = true;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variant not found';
        END IF;
        
        v_difference := p_new_quantity - v_current_qty;
        
        UPDATE product_variants
        SET quantity = p_new_quantity,
            updated_at = NOW()
        WHERE id = p_variant_id;
    ELSE
        -- Get and update product stock
        SELECT quantity INTO v_current_qty
        FROM products
        WHERE id = p_product_id
          AND store_id = p_store_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found';
        END IF;
        
        v_difference := p_new_quantity - v_current_qty;
        
        UPDATE products
        SET quantity = p_new_quantity
        WHERE id = p_product_id
          AND store_id = p_store_id;
    END IF;
    
    -- Create inventory log
    INSERT INTO inventory_logs (
        store_id, product_id, variant_id, type, quantity, note, created_by
    ) VALUES (
        p_store_id, p_product_id, p_variant_id, 'adjustment', v_difference, p_note, p_user_id
    ) RETURNING id INTO v_inventory_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'previous_quantity', v_current_qty,
        'new_quantity', p_new_quantity,
        'difference', v_difference,
        'inventory_log_id', v_inventory_log_id
    );
END;
$$;
