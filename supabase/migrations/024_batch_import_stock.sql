-- ============================================================================
-- BATCH IMPORT STOCK WITH SINGLE FINANCE ENTRY
-- ============================================================================
-- Import multiple products atomically with a single cash/bank book entry
-- This fixes the issue where each product in a batch creates separate entries
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_import_stock(
    p_store_id UUID,
    p_user_id UUID,
    p_items JSONB,  -- Array of {product_id, variant_id, quantity, unit_cost}
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
    v_item JSONB;
    v_product_id UUID;
    v_variant_id UUID;
    v_quantity INTEGER;
    v_unit_cost INTEGER;
    v_item_total INTEGER;
    v_total_cost INTEGER := 0;
    v_new_qty INTEGER;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_inventory_log_id UUID;
    v_batch_id UUID := gen_random_uuid();
    v_product_names TEXT[] := ARRAY[]::TEXT[];
    v_product_name TEXT;
    v_description TEXT;
    v_result_items JSONB := '[]'::JSONB;
BEGIN
    -- Process each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_variant_id := NULLIF(v_item->>'variant_id', '')::UUID;
        v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
        v_unit_cost := COALESCE((v_item->>'unit_cost')::INTEGER, 0);
        v_item_total := v_unit_cost * v_quantity;
        v_total_cost := v_total_cost + v_item_total;
        
        IF v_variant_id IS NOT NULL THEN
            -- Update variant stock
            UPDATE product_variants
            SET quantity = quantity + v_quantity,
                cost_price = COALESCE(NULLIF(v_unit_cost, 0), cost_price),
                updated_at = NOW()
            WHERE id = v_variant_id
              AND product_id = v_product_id
            RETURNING quantity INTO v_new_qty;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant not found: %', v_variant_id;
            END IF;
            
            -- Get product name for description
            SELECT p.name || ' - ' || pv.name INTO v_product_name
            FROM products p
            JOIN product_variants pv ON pv.id = v_variant_id
            WHERE p.id = v_product_id;
        ELSE
            -- Update product stock
            UPDATE products
            SET quantity = quantity + v_quantity,
                cost_price = COALESCE(NULLIF(v_unit_cost, 0), cost_price)
            WHERE id = v_product_id
              AND store_id = p_store_id
            RETURNING quantity, name INTO v_new_qty, v_product_name;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product not found: %', v_product_id;
            END IF;
        END IF;
        
        -- Collect product names for description
        v_product_names := array_append(v_product_names, v_product_name);
        
        -- Create inventory log (with batch_id to group them)
        INSERT INTO inventory_logs (
            store_id, product_id, variant_id, type, quantity,
            unit_cost, total_value, note, created_by, reference_type, reference_id
        ) VALUES (
            p_store_id, v_product_id, v_variant_id, 'import', v_quantity,
            v_unit_cost, v_item_total, p_note, p_user_id, 'batch', v_batch_id
        ) RETURNING id INTO v_inventory_log_id;
        
        -- Add to results
        v_result_items := v_result_items || jsonb_build_object(
            'product_id', v_product_id,
            'variant_id', v_variant_id,
            'quantity', v_quantity,
            'new_quantity', v_new_qty,
            'inventory_log_id', v_inventory_log_id
        );
    END LOOP;
    
    -- Build description for cash/bank book
    IF array_length(v_product_names, 1) <= 3 THEN
        v_description := 'Nhập hàng: ' || array_to_string(v_product_names, ', ');
    ELSE
        v_description := 'Nhập hàng: ' || v_product_names[1] || ', ' || v_product_names[2] || 
                         ' và ' || (array_length(v_product_names, 1) - 2)::TEXT || ' SP khác';
    END IF;
    
    IF p_supplier_name IS NOT NULL AND p_supplier_name != '' THEN
        v_description := v_description || ' - ' || p_supplier_name;
    END IF;
    
    -- Record SINGLE expense for the entire batch
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
                v_description,
                'inventory_import', v_batch_id,
                0, v_total_cost, v_new_balance,
                p_user_id
            );
        ELSIF p_payment_method = 'bank_transfer' AND p_bank_account_id IS NOT NULL THEN
            -- Update bank account balance
            UPDATE bank_accounts
            SET balance = balance - v_total_cost
            WHERE id = p_bank_account_id
            RETURNING balance INTO v_new_balance;
            
            -- Insert into bank_book for reporting
            INSERT INTO bank_book (
                store_id, bank_account_id, transaction_date, description,
                reference_type, reference_id, debit, credit
            ) VALUES (
                p_store_id,
                p_bank_account_id,
                CURRENT_DATE,
                v_description,
                'inventory_import',
                v_batch_id,
                0,
                v_total_cost
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'total_cost', v_total_cost,
        'items', v_result_items
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION batch_import_stock(UUID, UUID, JSONB, TEXT, BOOLEAN, VARCHAR, UUID, VARCHAR) TO authenticated;
