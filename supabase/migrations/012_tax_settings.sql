-- Add tax configuration columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS business_type VARCHAR(20) DEFAULT 'retail'
  CHECK (business_type IN ('retail', 'food_service', 'other_service')),
ADD COLUMN IF NOT EXISTS default_vat_rate INTEGER DEFAULT 8
  CHECK (default_vat_rate IN (0, 8, 10)),
ADD COLUMN IF NOT EXISTS pit_rate NUMERIC(4,2) DEFAULT 1.5
  CHECK (pit_rate IN (0, 1, 1.5, 2));

-- Create index on stores for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_id ON stores(id);

-- Add comment to explain the columns
COMMENT ON COLUMN stores.business_type IS 'Type of business: retail, food_service, or other_service';
COMMENT ON COLUMN stores.default_vat_rate IS 'Default VAT rate in percentage (0, 8, or 10)';
COMMENT ON COLUMN stores.pit_rate IS 'Personal income tax rate as percentage (1, 1.5, or 2)';
