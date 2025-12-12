-- Migration: Add variant-unit pricing support
-- This enables products with both variants and units to have pricing for each combination
-- Example: "Pencil - Red (piece)" and "Pencil - Red (dozen)" can have different prices

-- Variant Units table: stores pricing for each variant + unit combination
CREATE TABLE IF NOT EXISTS variant_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES product_units(id) ON DELETE CASCADE,
    sell_price INTEGER, -- Selling price for this variant+unit combination
    cost_price INTEGER, -- Cost price for this variant+unit combination
    barcode VARCHAR(50), -- Unique barcode for this combination
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variant_id, unit_id)
);

CREATE INDEX idx_variant_units_variant ON variant_units(variant_id);
CREATE INDEX idx_variant_units_unit ON variant_units(unit_id);
CREATE INDEX idx_variant_units_barcode ON variant_units(barcode);

-- Update sale_items to support variant + unit combination
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant_unit_id UUID REFERENCES variant_units(id);

-- Update inventory_logs to support variant + unit combination  
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS variant_unit_id UUID REFERENCES variant_units(id);

-- RLS Policy for variant_units
ALTER TABLE variant_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage variant units for their store" ON variant_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            JOIN users u ON u.store_id = p.store_id
            WHERE pv.id = variant_units.variant_id
            AND u.id = auth.uid()
        )
    );

-- Helper view to get all variant+unit combinations for a product
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
    CONCAT(pv.name, ' (', pu.unit_name, ')') AS display_name
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.active = TRUE
JOIN product_units pu ON pu.product_id = p.id AND pu.active = TRUE
LEFT JOIN variant_units vu ON vu.variant_id = pv.id AND vu.unit_id = pu.id AND vu.active = TRUE
WHERE p.has_variants = TRUE AND p.has_units = TRUE;
