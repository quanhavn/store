-- Migration: Remove duplicate columns from product_variants
-- These columns are now stored in variant_units table for each variant+unit combination
-- The base unit entry in variant_units holds what was previously in product_variants
-- 
-- Columns removed: sell_price, cost_price, sku, barcode
-- Columns kept: quantity, min_stock (stock is tracked at variant level)

-- Drop the view first since it depends on the columns we're removing
DROP VIEW IF EXISTS product_variant_unit_combinations;

-- Migrate existing data from product_variants to variant_units before dropping columns
DO $$
DECLARE
    v RECORD;
    base_unit_id UUID;
BEGIN
    FOR v IN 
        SELECT pv.id as variant_id, pv.product_id, pv.sell_price, pv.cost_price, pv.sku, pv.barcode
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE p.has_units = TRUE AND p.has_variants = TRUE AND pv.active = TRUE
    LOOP
        -- Find the base unit for this product
        SELECT id INTO base_unit_id
        FROM product_units
        WHERE product_id = v.product_id AND is_base_unit = TRUE AND active = TRUE
        LIMIT 1;
        
        -- If base unit exists, upsert variant_unit entry
        IF base_unit_id IS NOT NULL THEN
            INSERT INTO variant_units (variant_id, unit_id, sell_price, cost_price, sku, barcode)
            VALUES (v.variant_id, base_unit_id, v.sell_price, v.cost_price, v.sku, v.barcode)
            ON CONFLICT (variant_id, unit_id) DO UPDATE SET
                sell_price = COALESCE(variant_units.sell_price, EXCLUDED.sell_price),
                cost_price = COALESCE(variant_units.cost_price, EXCLUDED.cost_price),
                sku = COALESCE(variant_units.sku, EXCLUDED.sku),
                barcode = COALESCE(variant_units.barcode, EXCLUDED.barcode);
        END IF;
    END LOOP;
END $$;

-- Now drop the duplicate columns
ALTER TABLE product_variants DROP COLUMN IF EXISTS sell_price;
ALTER TABLE product_variants DROP COLUMN IF EXISTS cost_price;
ALTER TABLE product_variants DROP COLUMN IF EXISTS sku;
ALTER TABLE product_variants DROP COLUMN IF EXISTS barcode;

CREATE OR REPLACE VIEW product_variant_unit_combinations AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.store_id,
    pv.id AS variant_id,
    pv.name AS variant_name,
    pv.quantity AS variant_quantity,
    pu.id AS unit_id,
    pu.unit_name,
    pu.conversion_rate,
    pu.is_base_unit,
    vu.id AS variant_unit_id,
    vu.sell_price AS effective_sell_price,
    vu.cost_price AS effective_cost_price,
    vu.barcode AS effective_barcode,
    vu.sku AS effective_sku,
    CONCAT(pv.name, ' (', pu.unit_name, ')') AS display_name
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.active = TRUE
JOIN product_units pu ON pu.product_id = p.id AND pu.active = TRUE
LEFT JOIN variant_units vu ON vu.variant_id = pv.id AND vu.unit_id = pu.id AND vu.active = TRUE
WHERE p.has_variants = TRUE AND p.has_units = TRUE;
