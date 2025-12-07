-- Migration: Add product variants and multiple units support
-- This enables:
-- 1. Multiple units per product (e.g., kg and gram, 1L and 500ml)
-- 2. Product variants (size, color, flavor) with separate stock and pricing

-- Product Units (for multi-unit support)
-- Allows a product to have multiple selling units with conversion rates
CREATE TABLE product_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    unit_name VARCHAR(50) NOT NULL,
    conversion_rate DECIMAL(10,4) NOT NULL DEFAULT 1, -- How many base units in this unit
    barcode VARCHAR(50),
    sell_price INTEGER, -- Override price for this unit (null = calculate from base)
    cost_price INTEGER, -- Override cost for this unit
    is_base_unit BOOLEAN DEFAULT FALSE, -- The primary/smallest unit
    is_default BOOLEAN DEFAULT FALSE, -- Default unit shown in POS
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, unit_name)
);

CREATE INDEX idx_product_units_product ON product_units(product_id);
CREATE INDEX idx_product_units_barcode ON product_units(barcode);

-- Product Variant Attributes (defines what attributes exist: size, color, flavor)
CREATE TABLE product_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "Size", "Color", "Flavor"
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name)
);

-- Product Attribute Values (the actual values: S, M, L, Red, Blue)
CREATE TABLE product_attribute_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribute_id UUID REFERENCES product_attributes(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL, -- e.g., "S", "M", "L", "Red"
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(attribute_id, value)
);

CREATE INDEX idx_attribute_values_attribute ON product_attribute_values(attribute_id);

-- Product Variants (actual product variations with their own stock/price)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(50),
    barcode VARCHAR(50),
    name VARCHAR(255), -- Auto-generated or custom variant name
    cost_price INTEGER,
    sell_price INTEGER,
    quantity INTEGER DEFAULT 0,
    min_stock INTEGER,
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- Variant Attribute Junction (links variants to their attribute values)
-- e.g., Variant "T-Shirt Size M Red" has attribute_value_id for "M" and "Red"
CREATE TABLE product_variant_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    attribute_id UUID REFERENCES product_attributes(id) ON DELETE CASCADE,
    attribute_value_id UUID REFERENCES product_attribute_values(id) ON DELETE CASCADE,
    UNIQUE(variant_id, attribute_id)
);

CREATE INDEX idx_variant_attrs_variant ON product_variant_attributes(variant_id);

-- Add has_variants and has_units flags to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_units BOOLEAN DEFAULT FALSE;

-- Update sale_items to support variants and units
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES product_units(id);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_name VARCHAR(50);

-- Update inventory_logs to support variants and units
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES product_units(id);

-- Trigger to update updated_at for product_variants
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stock checks should also support variants
CREATE TABLE IF NOT EXISTS stock_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    note TEXT
);

CREATE TABLE IF NOT EXISTS stock_check_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_check_id UUID REFERENCES stock_checks(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    system_quantity INTEGER NOT NULL,
    actual_quantity INTEGER,
    difference INTEGER GENERATED ALWAYS AS (COALESCE(actual_quantity, 0) - system_quantity) STORED,
    note TEXT,
    checked_at TIMESTAMPTZ
);

CREATE INDEX idx_stock_check_items_check ON stock_check_items(stock_check_id);

-- RLS Policies for new tables
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_check_items ENABLE ROW LEVEL SECURITY;

-- Product units policy (access through product's store_id)
CREATE POLICY "Users can manage product units for their store" ON product_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN users u ON u.store_id = p.store_id
            WHERE p.id = product_units.product_id
            AND u.id = auth.uid()
        )
    );

-- Product attributes policy
CREATE POLICY "Users can manage product attributes for their store" ON product_attributes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND store_id = product_attributes.store_id
        )
    );

-- Attribute values policy (access through attribute's store_id)
CREATE POLICY "Users can manage attribute values for their store" ON product_attribute_values
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM product_attributes pa
            JOIN users u ON u.store_id = pa.store_id
            WHERE pa.id = product_attribute_values.attribute_id
            AND u.id = auth.uid()
        )
    );

-- Product variants policy
CREATE POLICY "Users can manage product variants for their store" ON product_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products p
            JOIN users u ON u.store_id = p.store_id
            WHERE p.id = product_variants.product_id
            AND u.id = auth.uid()
        )
    );

-- Variant attributes policy
CREATE POLICY "Users can manage variant attributes for their store" ON product_variant_attributes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            JOIN users u ON u.store_id = p.store_id
            WHERE pv.id = product_variant_attributes.variant_id
            AND u.id = auth.uid()
        )
    );

-- Stock checks policy
CREATE POLICY "Users can manage stock checks for their store" ON stock_checks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND store_id = stock_checks.store_id
        )
    );

-- Stock check items policy
CREATE POLICY "Users can manage stock check items for their store" ON stock_check_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stock_checks sc
            JOIN users u ON u.store_id = sc.store_id
            WHERE sc.id = stock_check_items.stock_check_id
            AND u.id = auth.uid()
        )
    );
