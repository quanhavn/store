-- Add pit_rate column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS pit_rate NUMERIC(4,2);

COMMENT ON COLUMN products.pit_rate IS 'Household business PIT rate (direct method) for this product: 0, 0.5, 1, 1.5, 2, or 5%';

-- Backfill existing products with store default
UPDATE products p
SET pit_rate = s.pit_rate
FROM stores s
WHERE p.store_id = s.id
  AND p.pit_rate IS NULL;
