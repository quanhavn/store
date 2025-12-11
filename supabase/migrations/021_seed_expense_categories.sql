-- Seed default expense categories for Vietnamese retail stores
-- Categories are store-specific, so we insert them via a function that runs on store creation
-- For existing stores, we run this migration to add default categories

-- First, create a function to seed expense categories for a store
CREATE OR REPLACE FUNCTION seed_expense_categories(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only seed if store has no categories yet
    IF EXISTS (SELECT 1 FROM expense_categories WHERE store_id = p_store_id LIMIT 1) THEN
        RETURN;
    END IF;

    -- Standard expense categories based on Vietnamese tax regulations
    INSERT INTO expense_categories (store_id, name, code, is_deductible) VALUES
        (p_store_id, 'Giá vốn hàng bán', 'COGS', true),
        (p_store_id, 'Chi phí nhân công', 'LABOR', true),
        (p_store_id, 'Chi phí điện', 'ELECTRICITY', true),
        (p_store_id, 'Chi phí nước', 'WATER', true),
        (p_store_id, 'Chi phí viễn thông', 'TELECOM', true),
        (p_store_id, 'Chi phí thuê kho bãi, mặt bằng kinh doanh', 'RENT', true),
        (p_store_id, 'Chi phí quản lý (văn phòng phẩm, công cụ, dụng cụ...)', 'ADMIN', true),
        (p_store_id, 'Chi phí khác (hội nghị, công tác phí, thanh lý, thuê ngoài...)', 'OTHER', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_expense_categories(UUID) TO authenticated;

-- Seed categories for all existing stores that don't have any
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM stores LOOP
        PERFORM seed_expense_categories(r.id);
    END LOOP;
END;
$$;

-- Update the registration function to seed categories on store creation
-- (This is typically called after store is created during onboarding)
COMMENT ON FUNCTION seed_expense_categories IS 'Seeds default expense categories for a store. Call this after creating a new store.';
