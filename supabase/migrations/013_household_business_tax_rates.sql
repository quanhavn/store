-- Update tax settings for Vietnam Household Business (Hộ Kinh Doanh) 2026
-- VAT and PIT rates use direct method (calculated on revenue, not added to invoices)

-- Drop existing check constraints
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_business_type_check;
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_default_vat_rate_check;
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_pit_rate_check;

-- Migrate existing data: convert old enterprise rates to household business rates
-- Old 8% or 10% (enterprise) -> 1% (household business retail default)
UPDATE stores SET default_vat_rate = 1 WHERE default_vat_rate IN (8, 10);
-- Migrate PIT rates that don't exist in new schema
UPDATE stores SET pit_rate = 0.5 WHERE pit_rate NOT IN (0, 0.5, 1, 1.5, 2, 5);

-- Update business_type constraint to include more options
ALTER TABLE stores 
ADD CONSTRAINT stores_business_type_check 
CHECK (business_type IN ('retail', 'food_service', 'manufacturing', 'transport', 'other_service', 'property_lease'));

-- Update VAT rate constraint for household business (direct method rates)
-- 1% - Phân phối, cung cấp hàng hóa (Distribution/goods)
-- 2% - Sản xuất, vận tải (Manufacturing, transport)  
-- 3% - Dịch vụ, xây dựng không bao thầu NVL (Services)
-- 5% - Cho thuê tài sản (Property lease)
-- 0% - Tax exempt (under 200M revenue)
ALTER TABLE stores 
ADD CONSTRAINT stores_default_vat_rate_check 
CHECK (default_vat_rate IN (0, 1, 2, 3, 5));

-- Update PIT rate constraint for household business
-- 0.5% - Phân phối, cung cấp hàng hóa
-- 1% - Dịch vụ
-- 1.5% - Sản xuất, vận tải, ăn uống
-- 2% - Dịch vụ khác
-- 5% - Cho thuê tài sản
-- 0% - Tax exempt
ALTER TABLE stores 
ADD CONSTRAINT stores_pit_rate_check 
CHECK (pit_rate IN (0, 0.5, 1, 1.5, 2, 5));

-- Update default values for new stores
ALTER TABLE stores ALTER COLUMN default_vat_rate SET DEFAULT 1;
ALTER TABLE stores ALTER COLUMN pit_rate SET DEFAULT 0.5;

-- Update comments
COMMENT ON COLUMN stores.business_type IS 'Type of business: retail, food_service, manufacturing, transport, other_service, property_lease';
COMMENT ON COLUMN stores.default_vat_rate IS 'Household business VAT rate (direct method): 0, 1, 2, 3, or 5%';
COMMENT ON COLUMN stores.pit_rate IS 'Household business PIT rate: 0, 0.5, 1, 1.5, 2, or 5%';
