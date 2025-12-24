-- Migration: Create inventory_snapshots table for efficient opening stock calculations
-- Instead of scanning all historical logs O(N), query from the nearest snapshot O(1) + O(delta)

-- Create monthly inventory snapshots table
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    -- Snapshot date (first day of month, e.g., 2025-01-01)
    snapshot_date DATE NOT NULL,
    
    -- Closing quantity at end of previous month (= opening for this month)
    closing_quantity INTEGER NOT NULL DEFAULT 0,
    closing_value BIGINT NOT NULL DEFAULT 0,    -- total value in VND, BIGINT to avoid overflow
    average_cost INTEGER NOT NULL DEFAULT 0,    -- WAC at snapshot time
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One snapshot per product/variant per month per store
    UNIQUE(store_id, product_id, variant_id, snapshot_date)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_lookup 
ON inventory_snapshots(store_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_product 
ON inventory_snapshots(store_id, product_id, variant_id, snapshot_date DESC);

-- Function to calculate opening stock efficiently using snapshots
-- Returns opening stock for all products/variants as of a given date
CREATE OR REPLACE FUNCTION get_opening_stock(
    p_store_id UUID,
    p_date DATE
)
RETURNS TABLE (
    product_id UUID,
    variant_id UUID,
    opening_quantity INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_snapshot_date DATE;
BEGIN
    -- Find the most recent snapshot before the requested date
    -- Snapshots are stored as first day of month
    v_snapshot_date := DATE_TRUNC('month', p_date)::DATE;
    
    RETURN QUERY
    WITH snapshot_data AS (
        -- Get the latest snapshot for each product/variant before requested date
        SELECT DISTINCT ON (s.product_id, s.variant_id)
            s.product_id,
            s.variant_id,
            s.closing_quantity,
            s.snapshot_date
        FROM inventory_snapshots s
        WHERE s.store_id = p_store_id
          AND s.snapshot_date <= v_snapshot_date
        ORDER BY s.product_id, s.variant_id, s.snapshot_date DESC
    ),
    log_adjustments AS (
        -- Sum all logs between snapshot date and requested date
        SELECT 
            il.product_id,
            il.variant_id,
            SUM(
                CASE 
                    WHEN il.type IN ('import', 'return') THEN ABS(il.quantity)
                    ELSE -ABS(il.quantity)
                END
            )::INTEGER as adjustment
        FROM inventory_logs il
        LEFT JOIN snapshot_data sd 
            ON sd.product_id = il.product_id 
            AND (sd.variant_id = il.variant_id OR (sd.variant_id IS NULL AND il.variant_id IS NULL))
        WHERE il.store_id = p_store_id
          AND il.created_at >= COALESCE(sd.snapshot_date, '1970-01-01'::DATE)
          AND il.created_at < p_date
        GROUP BY il.product_id, il.variant_id
    ),
    all_products AS (
        -- Combine snapshot and log data
        SELECT 
            COALESCE(sd.product_id, la.product_id) as product_id,
            COALESCE(sd.variant_id, la.variant_id) as variant_id,
            COALESCE(sd.closing_quantity, 0) + COALESCE(la.adjustment, 0) as opening_quantity
        FROM snapshot_data sd
        FULL OUTER JOIN log_adjustments la 
            ON la.product_id = sd.product_id 
            AND (la.variant_id = sd.variant_id OR (la.variant_id IS NULL AND sd.variant_id IS NULL))
    )
    SELECT 
        ap.product_id,
        ap.variant_id,
        ap.opening_quantity
    FROM all_products ap
    WHERE ap.opening_quantity != 0;
END;
$$;

-- Function to generate monthly snapshots (run via cron job or manually)
CREATE OR REPLACE FUNCTION generate_inventory_snapshot(
    p_store_id UUID,
    p_snapshot_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_snapshot_date DATE;
    v_count INTEGER;
BEGIN
    -- Default to first day of current month
    v_snapshot_date := COALESCE(p_snapshot_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
    
    -- Insert snapshots for all products/variants
    INSERT INTO inventory_snapshots (store_id, product_id, variant_id, snapshot_date, closing_quantity, closing_value, average_cost)
    SELECT 
        p_store_id,
        ic.product_id,
        ic.variant_id,
        v_snapshot_date,
        ic.total_quantity,
        ic.total_value,
        ic.average_cost
    FROM inventory_costs ic
    WHERE ic.store_id = p_store_id
    ON CONFLICT (store_id, product_id, variant_id, snapshot_date) 
    DO UPDATE SET
        closing_quantity = EXCLUDED.closing_quantity,
        closing_value = EXCLUDED.closing_value,
        average_cost = EXCLUDED.average_cost;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Generate initial snapshots for all stores (first day of current month)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT store_id FROM inventory_costs LOOP
        PERFORM generate_inventory_snapshot(r.store_id);
    END LOOP;
END;
$$;
