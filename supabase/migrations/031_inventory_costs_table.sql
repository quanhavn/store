-- Migration: Create inventory_costs table for Weighted Average Cost (WAC) tracking
-- WAC is calculated separately from product.cost_price (reference price)
-- Formula: new_avg = (old_qty × old_avg + import_qty × import_cost) / (old_qty + import_qty)

-- Create inventory_costs table
-- Tracks WAC per (product_id, variant_id) combination
-- variant_id = NULL for simple products (case 1-0, 1-n)
-- All values are in BASE UNIT
CREATE TABLE IF NOT EXISTS inventory_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    -- All values in BASE UNIT
    total_quantity INTEGER NOT NULL DEFAULT 0,  -- current quantity in base units
    total_value BIGINT NOT NULL DEFAULT 0,      -- total cost value in VND (qty × avg_cost), use BIGINT to avoid overflow
    average_cost INTEGER NOT NULL DEFAULT 0,    -- weighted average cost per base unit
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one record per product/variant combination per store
    UNIQUE(store_id, product_id, variant_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_costs_store_product ON inventory_costs(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_costs_variant ON inventory_costs(variant_id) WHERE variant_id IS NOT NULL;

-- Initialize inventory_costs from existing data
-- For products without variants: use products.quantity and products.cost_price
-- For products with variants: use product_variants.quantity and variant_units.cost_price (via base unit)
INSERT INTO inventory_costs (store_id, product_id, variant_id, total_quantity, total_value, average_cost)
SELECT 
    p.store_id,
    p.id as product_id,
    NULL as variant_id,
    COALESCE(p.quantity, 0) as total_quantity,
    COALESCE(p.quantity, 0)::BIGINT * COALESCE(p.cost_price, 0)::BIGINT as total_value,
    COALESCE(p.cost_price, 0) as average_cost
FROM products p
WHERE p.active = true 
  AND p.has_variants = false
  AND NOT EXISTS (
    SELECT 1 FROM inventory_costs ic 
    WHERE ic.product_id = p.id AND ic.variant_id IS NULL
  )
ON CONFLICT (store_id, product_id, variant_id) DO NOTHING;

-- Initialize for variants: get cost from variant_units (base unit entry)
INSERT INTO inventory_costs (store_id, product_id, variant_id, total_quantity, total_value, average_cost)
SELECT 
    p.store_id,
    p.id as product_id,
    pv.id as variant_id,
    COALESCE(pv.quantity, 0) as total_quantity,
    COALESCE(pv.quantity, 0)::BIGINT * COALESCE(vu.cost_price, p.cost_price, 0)::BIGINT as total_value,
    COALESCE(vu.cost_price, p.cost_price, 0) as average_cost
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.active = true
LEFT JOIN product_units pu ON pu.product_id = p.id AND pu.is_base_unit = true AND pu.active = true
LEFT JOIN variant_units vu ON vu.variant_id = pv.id AND vu.unit_id = pu.id AND vu.active = true
WHERE p.active = true 
  AND p.has_variants = true
  AND NOT EXISTS (
    SELECT 1 FROM inventory_costs ic 
    WHERE ic.product_id = p.id AND ic.variant_id = pv.id
  )
ON CONFLICT (store_id, product_id, variant_id) DO NOTHING;

-- Function to get or create inventory_cost record
CREATE OR REPLACE FUNCTION get_or_create_inventory_cost(
    p_store_id UUID,
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_initial_cost INTEGER DEFAULT 0
)
RETURNS inventory_costs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result inventory_costs;
BEGIN
    -- Try to get existing record
    SELECT * INTO v_result
    FROM inventory_costs
    WHERE store_id = p_store_id 
      AND product_id = p_product_id 
      AND variant_id IS NOT DISTINCT FROM p_variant_id;
    
    IF NOT FOUND THEN
        -- Create new record
        INSERT INTO inventory_costs (store_id, product_id, variant_id, total_quantity, total_value, average_cost)
        VALUES (p_store_id, p_product_id, p_variant_id, 0, 0, p_initial_cost)
        RETURNING * INTO v_result;
    END IF;
    
    RETURN v_result;
END;
$$;

-- Function to update WAC on inventory import
-- Returns the new average cost
CREATE OR REPLACE FUNCTION update_inventory_cost_import(
    p_store_id UUID,
    p_product_id UUID,
    p_variant_id UUID,
    p_quantity INTEGER,      -- quantity in BASE units
    p_unit_cost INTEGER      -- cost per BASE unit
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ic inventory_costs;
    v_new_qty INTEGER;
    v_new_total_value BIGINT;
    v_new_avg_cost INTEGER;
BEGIN
    -- Get or create inventory_cost record
    v_ic := get_or_create_inventory_cost(p_store_id, p_product_id, p_variant_id, p_unit_cost);
    
    -- Calculate new weighted average
    v_new_qty := v_ic.total_quantity + p_quantity;
    
    IF v_new_qty > 0 THEN
        v_new_total_value := (v_ic.total_quantity::BIGINT * v_ic.average_cost::BIGINT) + (p_quantity::BIGINT * p_unit_cost::BIGINT);
        v_new_avg_cost := (v_new_total_value / v_new_qty)::INTEGER;
    ELSE
        v_new_total_value := 0;
        v_new_avg_cost := p_unit_cost; -- Use import cost as new average
    END IF;
    
    -- Update record
    UPDATE inventory_costs
    SET total_quantity = v_new_qty,
        total_value = v_new_total_value,
        average_cost = v_new_avg_cost,
        updated_at = NOW()
    WHERE id = v_ic.id;
    
    RETURN v_new_avg_cost;
END;
$$;

-- Function to update WAC on inventory export/sale
-- Uses current average cost for COGS
CREATE OR REPLACE FUNCTION update_inventory_cost_export(
    p_store_id UUID,
    p_product_id UUID,
    p_variant_id UUID,
    p_quantity INTEGER      -- quantity in BASE units (positive number)
)
RETURNS INTEGER  -- Returns the average cost used for COGS
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ic inventory_costs;
    v_new_qty INTEGER;
    v_new_total_value BIGINT;
    v_cogs_per_unit INTEGER;
BEGIN
    -- Get inventory_cost record (must exist)
    SELECT * INTO v_ic
    FROM inventory_costs
    WHERE store_id = p_store_id 
      AND product_id = p_product_id 
      AND variant_id IS NOT DISTINCT FROM p_variant_id;
    
    IF NOT FOUND THEN
        -- If no record, return 0 (no COGS)
        RETURN 0;
    END IF;
    
    -- Use current average cost for COGS
    v_cogs_per_unit := v_ic.average_cost;
    
    -- Calculate new totals (quantity decreases, but avg cost stays the same)
    v_new_qty := GREATEST(v_ic.total_quantity - p_quantity, 0);
    v_new_total_value := v_new_qty::BIGINT * v_ic.average_cost::BIGINT;
    
    -- Update record
    UPDATE inventory_costs
    SET total_quantity = v_new_qty,
        total_value = v_new_total_value,
        -- average_cost stays the same on export
        updated_at = NOW()
    WHERE id = v_ic.id;
    
    RETURN v_cogs_per_unit;
END;
$$;

-- Function to get current WAC for a product/variant
CREATE OR REPLACE FUNCTION get_average_cost(
    p_store_id UUID,
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_avg_cost INTEGER;
BEGIN
    SELECT average_cost INTO v_avg_cost
    FROM inventory_costs
    WHERE store_id = p_store_id 
      AND product_id = p_product_id 
      AND variant_id IS NOT DISTINCT FROM p_variant_id;
    
    IF NOT FOUND THEN
        -- Fallback to product/variant cost_price
        IF p_variant_id IS NOT NULL THEN
            SELECT COALESCE(vu.cost_price, p.cost_price, 0) INTO v_avg_cost
            FROM products p
            LEFT JOIN product_units pu ON pu.product_id = p.id AND pu.is_base_unit = true AND pu.active = true
            LEFT JOIN variant_units vu ON vu.variant_id = p_variant_id AND vu.unit_id = pu.id AND vu.active = true
            WHERE p.id = p_product_id;
        ELSE
            SELECT COALESCE(cost_price, 0) INTO v_avg_cost
            FROM products
            WHERE id = p_product_id;
        END IF;
    END IF;
    
    RETURN COALESCE(v_avg_cost, 0);
END;
$$;

-- Update import_stock_with_variant to use inventory_costs table instead of updating product.cost_price
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
    v_new_avg_cost INTEGER;
    v_effective_unit_cost INTEGER;
BEGIN
    v_effective_unit_cost := COALESCE(p_unit_cost, 0);
    v_total_cost := v_effective_unit_cost * p_quantity;
    
    IF p_variant_id IS NOT NULL THEN
        -- Update variant stock (quantity only, NOT cost_price)
        UPDATE product_variants
        SET quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE id = p_variant_id
          AND product_id = p_product_id
        RETURNING quantity INTO v_new_qty;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variant not found';
        END IF;
    ELSE
        -- Update product stock (quantity only, NOT cost_price)
        UPDATE products
        SET quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE id = p_product_id
          AND store_id = p_store_id
        RETURNING quantity INTO v_new_qty;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found';
        END IF;
    END IF;
    
    -- Update WAC in inventory_costs table
    IF v_effective_unit_cost > 0 THEN
        v_new_avg_cost := update_inventory_cost_import(
            p_store_id, p_product_id, p_variant_id,
            p_quantity, v_effective_unit_cost
        );
    ELSE
        v_new_avg_cost := get_average_cost(p_store_id, p_product_id, p_variant_id);
    END IF;
    
    -- Create inventory log
    INSERT INTO inventory_logs (
        store_id, product_id, variant_id, type, quantity,
        unit_cost, total_value, note, created_by
    ) VALUES (
        p_store_id, p_product_id, p_variant_id, 'import', p_quantity,
        v_effective_unit_cost, v_total_cost, p_note, p_user_id
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
            WHERE id = p_bank_account_id
            RETURNING balance INTO v_new_balance;
            
            INSERT INTO bank_book (
                store_id, bank_account_id, transaction_date, description,
                reference_type, reference_id, debit, credit
            ) VALUES (
                p_store_id,
                p_bank_account_id,
                CURRENT_DATE,
                'Nhập hàng' || COALESCE(' - ' || p_supplier_name, ''),
                'inventory_import',
                v_inventory_log_id,
                0,
                v_total_cost
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'new_quantity', v_new_qty,
        'new_avg_cost', v_new_avg_cost,
        'inventory_log_id', v_inventory_log_id
    );
END;
$$;

-- Update batch_import_stock to use inventory_costs table
CREATE OR REPLACE FUNCTION batch_import_stock(
    p_store_id UUID,
    p_user_id UUID,
    p_items JSONB,
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
    v_new_avg_cost INTEGER;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_variant_id := NULLIF(v_item->>'variant_id', '')::UUID;
        v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
        v_unit_cost := COALESCE((v_item->>'unit_cost')::INTEGER, 0);
        
        IF (v_item->>'item_total') IS NOT NULL AND (v_item->>'item_total')::INTEGER > 0 THEN
            v_item_total := (v_item->>'item_total')::INTEGER;
            IF v_quantity > 0 THEN
                v_unit_cost := v_item_total / v_quantity;
            END IF;
        ELSE
            v_item_total := v_unit_cost * v_quantity;
        END IF;
        
        v_total_cost := v_total_cost + v_item_total;
        
        IF v_variant_id IS NOT NULL THEN
            -- Update variant stock (quantity only)
            UPDATE product_variants
            SET quantity = quantity + v_quantity,
                updated_at = NOW()
            WHERE id = v_variant_id
              AND product_id = v_product_id
            RETURNING quantity INTO v_new_qty;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant not found: %', v_variant_id;
            END IF;
            
            SELECT p.name || ' - ' || pv.name INTO v_product_name
            FROM products p
            JOIN product_variants pv ON pv.id = v_variant_id
            WHERE p.id = v_product_id;
        ELSE
            -- Update product stock (quantity only)
            UPDATE products
            SET quantity = quantity + v_quantity,
                updated_at = NOW()
            WHERE id = v_product_id
              AND store_id = p_store_id
            RETURNING quantity, name INTO v_new_qty, v_product_name;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product not found: %', v_product_id;
            END IF;
        END IF;
        
        -- Update WAC in inventory_costs table
        IF v_unit_cost > 0 THEN
            v_new_avg_cost := update_inventory_cost_import(
                p_store_id, v_product_id, v_variant_id,
                v_quantity, v_unit_cost
            );
        ELSE
            v_new_avg_cost := get_average_cost(p_store_id, v_product_id, v_variant_id);
        END IF;
        
        v_product_names := array_append(v_product_names, v_product_name);
        
        INSERT INTO inventory_logs (
            store_id, product_id, variant_id, type, quantity,
            unit_cost, total_value, note, created_by, reference_type, reference_id
        ) VALUES (
            p_store_id, v_product_id, v_variant_id, 'import', v_quantity,
            v_unit_cost, v_item_total, p_note, p_user_id, 'batch', v_batch_id
        ) RETURNING id INTO v_inventory_log_id;
        
        v_result_items := v_result_items || jsonb_build_object(
            'product_id', v_product_id,
            'variant_id', v_variant_id,
            'quantity', v_quantity,
            'new_quantity', v_new_qty,
            'new_avg_cost', v_new_avg_cost,
            'inventory_log_id', v_inventory_log_id
        );
    END LOOP;
    
    IF array_length(v_product_names, 1) <= 3 THEN
        v_description := 'Nhập hàng: ' || array_to_string(v_product_names, ', ');
    ELSE
        v_description := 'Nhập hàng: ' || v_product_names[1] || ', ' || v_product_names[2] || 
                         ' và ' || (array_length(v_product_names, 1) - 2)::TEXT || ' SP khác';
    END IF;
    
    IF p_supplier_name IS NOT NULL AND p_supplier_name != '' THEN
        v_description := v_description || ' - ' || p_supplier_name;
    END IF;
    
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
            UPDATE bank_accounts
            SET balance = balance - v_total_cost
            WHERE id = p_bank_account_id
            RETURNING balance INTO v_new_balance;
            
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

-- Update create_sale to use WAC from inventory_costs for COGS
-- Also update inventory_costs when selling
CREATE OR REPLACE FUNCTION create_sale(
    p_store_id UUID,
    p_user_id UUID,
    p_items JSONB,
    p_payments JSONB,
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
    v_total_cogs INTEGER := 0;
    v_item_cost_price INTEGER;
    v_item_cogs INTEGER;
    v_cogs_category_id UUID;
    v_expense_id UUID;
    v_unit_id UUID;
    v_product_cost_price INTEGER;
BEGIN
    -- STEP 1: Validate items and calculate totals
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::INTEGER
                        - COALESCE((v_item->>'discount')::INTEGER, 0);
        v_subtotal := v_subtotal + v_item_total;
    END LOOP;

    v_total := v_subtotal - p_discount;

    IF p_payments IS NOT NULL THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
        LOOP
            v_payment_total := v_payment_total + (v_payment->>'amount')::INTEGER;
        END LOOP;
    END IF;

    v_amount_due := v_total - v_payment_total;

    -- STEP 2: Validate payment and debt requirements
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

    -- STEP 3: Validate stock and calculate COGS using WAC from inventory_costs
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_has_variant := (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '';
        v_conversion_rate := COALESCE((v_item->>'conversion_rate')::NUMERIC, 1);
        v_base_quantity := CEIL((v_item->>'quantity')::INTEGER * v_conversion_rate)::INTEGER;
        v_unit_id := NULLIF(v_item->>'unit_id', '')::UUID;
        
        IF v_has_variant THEN
            v_variant_id := (v_item->>'variant_id')::UUID;
            
            SELECT quantity INTO v_variant_qty
            FROM product_variants
            WHERE id = v_variant_id
              AND product_id = (v_item->>'product_id')::UUID
              AND active = true;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant not found: %', COALESCE(v_item->>'variant_name', v_item->>'product_name');
            END IF;
            
            IF v_variant_qty < v_base_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for % - %: only % available',
                    v_item->>'product_name', v_item->>'variant_name', v_variant_qty;
            END IF;
            
            -- Get WAC from inventory_costs table
            v_item_cost_price := get_average_cost(p_store_id, (v_item->>'product_id')::UUID, v_variant_id);
        ELSE
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
            
            -- Get WAC from inventory_costs table
            v_item_cost_price := get_average_cost(p_store_id, (v_item->>'product_id')::UUID, NULL);
        END IF;
        
        v_item_cogs := v_base_quantity * v_item_cost_price;
        v_total_cogs := v_total_cogs + v_item_cogs;
    END LOOP;

    -- STEP 4: Generate invoice number
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

    IF v_payment_total = 0 THEN
        v_payment_status := 'unpaid';
    ELSIF v_payment_total < v_total THEN
        v_payment_status := 'partial';
    ELSE
        v_payment_status := 'paid';
    END IF;

    -- STEP 5: Create sale record
    INSERT INTO sales (
        store_id, user_id, invoice_no, subtotal, vat_amount, discount, total,
        status, payment_status, amount_paid, amount_due,
        customer_id, customer_name, customer_phone, customer_tax_code,
        note, completed_at
    ) VALUES (
        p_store_id, p_user_id, v_invoice_no, v_subtotal, 0, p_discount, v_total,
        'completed', v_payment_status, v_payment_total,
        CASE WHEN v_amount_due > 0 THEN v_amount_due ELSE 0 END,
        p_customer_id, p_customer_name, p_customer_phone, p_customer_tax_code,
        p_note, NOW()
    ) RETURNING id INTO v_sale_id;

    -- STEP 6: Create sale items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::INTEGER
                        - COALESCE((v_item->>'discount')::INTEGER, 0);
        v_item_vat := 0;

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

    -- STEP 7: Create payment records
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

    -- STEP 8: Update stock, create inventory logs, and update inventory_costs
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_has_variant := (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') != '';
        v_conversion_rate := COALESCE((v_item->>'conversion_rate')::NUMERIC, 1);
        v_base_quantity := CEIL((v_item->>'quantity')::INTEGER * v_conversion_rate)::INTEGER;
        
        IF v_has_variant THEN
            v_variant_id := (v_item->>'variant_id')::UUID;
            
            UPDATE product_variants
            SET quantity = quantity - v_base_quantity,
                updated_at = NOW()
            WHERE id = v_variant_id;
            
            -- Update inventory_costs (decrease quantity)
            PERFORM update_inventory_cost_export(
                p_store_id, 
                (v_item->>'product_id')::UUID, 
                v_variant_id, 
                v_base_quantity
            );
            
            INSERT INTO inventory_logs (
                store_id, product_id, variant_id, type, quantity,
                unit_cost, reference_type, reference_id, created_by
            ) VALUES (
                p_store_id,
                (v_item->>'product_id')::UUID,
                v_variant_id,
                'sale',
                -v_base_quantity,
                get_average_cost(p_store_id, (v_item->>'product_id')::UUID, v_variant_id),
                'sales',
                v_sale_id,
                p_user_id
            );
        ELSE
            UPDATE products
            SET quantity = quantity - v_base_quantity
            WHERE id = (v_item->>'product_id')::UUID
              AND store_id = p_store_id;
            
            -- Update inventory_costs (decrease quantity)
            PERFORM update_inventory_cost_export(
                p_store_id, 
                (v_item->>'product_id')::UUID, 
                NULL, 
                v_base_quantity
            );

            INSERT INTO inventory_logs (
                store_id, product_id, type, quantity,
                unit_cost, reference_type, reference_id, created_by
            ) VALUES (
                p_store_id,
                (v_item->>'product_id')::UUID,
                'sale',
                -v_base_quantity,
                get_average_cost(p_store_id, (v_item->>'product_id')::UUID, NULL),
                'sales',
                v_sale_id,
                p_user_id
            );
        END IF;
    END LOOP;

    -- STEP 9: Cash book entries
    IF p_payments IS NOT NULL THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
        LOOP
            IF v_payment->>'method' = 'cash' THEN
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

            IF v_payment->>'method' = 'bank_transfer' AND (v_payment->>'bank_account_id') IS NOT NULL THEN
                UPDATE bank_accounts
                SET balance = balance + (v_payment->>'amount')::INTEGER
                WHERE id = (v_payment->>'bank_account_id')::UUID;
            END IF;
        END LOOP;
    END IF;

    -- STEP 10: Create COGS expense
    IF v_total_cogs > 0 THEN
        SELECT id INTO v_cogs_category_id
        FROM expense_categories
        WHERE store_id = p_store_id
          AND code = 'COGS'
        LIMIT 1;
        
        INSERT INTO expenses (
            store_id, category_id, description, amount, vat_amount,
            payment_method, expense_date, created_by
        ) VALUES (
            p_store_id, 
            v_cogs_category_id,
            'Giá vốn hàng bán - ' || v_invoice_no,
            v_total_cogs,
            0,
            'cash',
            CURRENT_DATE,
            p_user_id
        ) RETURNING id INTO v_expense_id;
    END IF;

    -- STEP 11: Create debt if applicable
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

    -- STEP 12: Apply debt payment if applicable
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

    -- STEP 13: Return result
    v_result := jsonb_build_object(
        'sale_id', v_sale_id,
        'invoice_no', v_invoice_no,
        'total', v_total,
        'cogs', v_total_cogs,
        'gross_profit', v_total - v_total_cogs,
        'payment_status', v_payment_status,
        'debt_id', v_debt_id
    );

    IF p_debt_payment_amount > 0 THEN
        v_result := v_result || jsonb_build_object('debt_payment_applied', p_debt_payment_amount - COALESCE(v_remaining_payment, 0));
    END IF;

    RETURN v_result;
END;
$$;

-- Update export_stock_with_variant to update inventory_costs
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
    v_avg_cost INTEGER;
BEGIN
    IF p_variant_id IS NOT NULL THEN
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
    
    -- Get WAC and update inventory_costs
    v_avg_cost := update_inventory_cost_export(p_store_id, p_product_id, p_variant_id, p_quantity);
    
    -- Create inventory log with unit_cost
    INSERT INTO inventory_logs (
        store_id, product_id, variant_id, type, quantity, unit_cost, total_value, note, created_by
    ) VALUES (
        p_store_id, p_product_id, p_variant_id, 'export', -p_quantity, 
        v_avg_cost, p_quantity * v_avg_cost, p_note, p_user_id
    ) RETURNING id INTO v_inventory_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'new_quantity', v_new_qty,
        'unit_cost', v_avg_cost,
        'inventory_log_id', v_inventory_log_id
    );
END;
$$;

-- Update adjust_stock_with_variant to update inventory_costs
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
    v_avg_cost INTEGER;
BEGIN
    IF p_variant_id IS NOT NULL THEN
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
    
    -- Get current average cost
    v_avg_cost := get_average_cost(p_store_id, p_product_id, p_variant_id);
    
    -- Update inventory_costs based on direction
    IF v_difference > 0 THEN
        -- Quantity increased - treat as import at current avg cost (no change to avg)
        PERFORM update_inventory_cost_import(p_store_id, p_product_id, p_variant_id, v_difference, v_avg_cost);
    ELSIF v_difference < 0 THEN
        -- Quantity decreased - treat as export
        PERFORM update_inventory_cost_export(p_store_id, p_product_id, p_variant_id, ABS(v_difference));
    END IF;
    
    -- Create inventory log
    INSERT INTO inventory_logs (
        store_id, product_id, variant_id, type, quantity, unit_cost, total_value, note, created_by
    ) VALUES (
        p_store_id, p_product_id, p_variant_id, 'adjustment', v_difference, 
        v_avg_cost, ABS(v_difference) * v_avg_cost, p_note, p_user_id
    ) RETURNING id INTO v_inventory_log_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'previous_quantity', v_current_qty,
        'new_quantity', p_new_quantity,
        'difference', v_difference,
        'unit_cost', v_avg_cost,
        'inventory_log_id', v_inventory_log_id
    );
END;
$$;
