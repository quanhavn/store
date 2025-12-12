-- Migration: Add SKU column to variant_units table
-- This allows each variant+unit combination to have its own SKU

ALTER TABLE variant_units ADD COLUMN IF NOT EXISTS sku VARCHAR(50);

-- Create index for SKU lookups
CREATE INDEX IF NOT EXISTS idx_variant_units_sku ON variant_units(sku);

-- Update the view to include SKU
DROP VIEW IF EXISTS product_variant_unit_combinations;

CREATE OR REPLACE VIEW product_variant_unit_combinations AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.store_id,
    pv.id AS variant_id,
    pv.name AS variant_name,
    pv.quantity AS variant_quantity,
    pv.sell_price AS variant_sell_price,
    pv.cost_price AS variant_cost_price,
    pv.sku AS variant_sku,
    pu.id AS unit_id,
    pu.unit_name,
    pu.conversion_rate,
    pu.is_base_unit,
    vu.id AS variant_unit_id,
    COALESCE(vu.sell_price, 
        CASE 
            WHEN pu.sell_price IS NOT NULL THEN pu.sell_price
            ELSE ROUND(pv.sell_price * pu.conversion_rate)
        END
    ) AS effective_sell_price,
    COALESCE(vu.cost_price,
        CASE 
            WHEN pu.cost_price IS NOT NULL THEN pu.cost_price
            ELSE ROUND(pv.cost_price * pu.conversion_rate)
        END
    ) AS effective_cost_price,
    COALESCE(vu.barcode, pv.barcode) AS effective_barcode,
    COALESCE(vu.sku, pv.sku) AS effective_sku,
    CONCAT(pv.name, ' (', pu.unit_name, ')') AS display_name
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.active = TRUE
JOIN product_units pu ON pu.product_id = p.id AND pu.active = TRUE
LEFT JOIN variant_units vu ON vu.variant_id = pv.id AND vu.unit_id = pu.id AND vu.active = TRUE
WHERE p.has_variants = TRUE AND p.has_units = TRUE;
