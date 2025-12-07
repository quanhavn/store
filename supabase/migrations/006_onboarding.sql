-- ============================================================================
-- ONBOARDING SUPPORT
-- ============================================================================
-- Adds onboarding_completed flag to track if store setup is complete.
-- New users must complete onboarding before accessing the main app.
-- ============================================================================

-- Add onboarding_completed column to stores
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing stores to mark them as onboarded (they already have data)
UPDATE stores 
SET onboarding_completed = TRUE 
WHERE name IS NOT NULL AND name != '';

-- Function to complete onboarding with full store info
CREATE OR REPLACE FUNCTION complete_store_onboarding(
    p_store_name VARCHAR(255),
    p_address TEXT,
    p_phone VARCHAR(20),
    p_email VARCHAR(255),
    p_tax_code VARCHAR(20),
    p_revenue_tier VARCHAR(20),
    p_e_invoice_required BOOLEAN
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_store_id UUID;
    v_result JSON;
BEGIN
    -- Get the authenticated user's ID
    v_user_id := auth.uid();

    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get the user's store_id
    SELECT store_id INTO v_store_id
    FROM users
    WHERE id = v_user_id;

    IF v_store_id IS NULL THEN
        RAISE EXCEPTION 'User does not have a store';
    END IF;

    -- Validate revenue tier
    IF p_revenue_tier IS NOT NULL AND p_revenue_tier NOT IN ('under_200m', '200m_1b', '1b_3b', 'over_3b') THEN
        RAISE EXCEPTION 'Invalid revenue tier';
    END IF;

    -- Update the store with onboarding data
    UPDATE stores
    SET 
        name = COALESCE(p_store_name, name),
        address = p_address,
        phone = p_phone,
        email = p_email,
        tax_code = p_tax_code,
        revenue_tier = COALESCE(p_revenue_tier, 'under_200m'),
        e_invoice_required = COALESCE(p_e_invoice_required, FALSE),
        onboarding_completed = TRUE,
        updated_at = NOW()
    WHERE id = v_store_id;

    -- Also update the user's name if store name changed
    UPDATE users
    SET name = COALESCE(p_store_name, name)
    WHERE id = v_user_id;

    -- Return success
    v_result := json_build_object(
        'success', true,
        'store_id', v_store_id,
        'message', 'Onboarding completed successfully'
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_store_onboarding(VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN) TO authenticated;

-- Revoke from anon
REVOKE EXECUTE ON FUNCTION complete_store_onboarding(VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN) FROM anon;
