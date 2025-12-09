-- Fix import_stock_with_variant function to use correct column name (total_value instead of total_cost)
-- The inventory_logs table has total_value column, not total_cost

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
    
    -- Create inventory log (fixed: use total_value instead of total_cost)
    INSERT INTO inventory_logs (
        store_id, product_id, variant_id, type, quantity,
        unit_cost, total_value, note, created_by
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
