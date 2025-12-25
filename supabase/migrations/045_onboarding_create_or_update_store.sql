-- Fix: Update onboarding to create store if user doesn't have one
-- This supports the simplified registration flow where store is created during onboarding
-- ============================================================================

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

    -- Try to get the user's existing store_id
    SELECT store_id INTO v_store_id
    FROM users
    WHERE id = v_user_id;

    -- If user doesn't exist or doesn't have a store, create both
    IF v_store_id IS NULL THEN
        -- Create the store
        INSERT INTO stores (name, phone, address, email, tax_code, revenue_tier, e_invoice_required, onboarding_completed)
        VALUES (
            p_store_name,
            p_phone,
            p_address,
            p_email,
            p_tax_code,
            COALESCE(p_revenue_tier, 'under_200m'),
            COALESCE(p_e_invoice_required, FALSE),
            TRUE
        )
        RETURNING id INTO v_store_id;

        -- Create or update the user profile linked to the store
        INSERT INTO users (id, store_id, name, phone, role)
        VALUES (v_user_id, v_store_id, p_store_name, p_phone, 'owner')
        ON CONFLICT (id) DO UPDATE
        SET store_id = v_store_id,
            name = COALESCE(EXCLUDED.name, users.name),
            phone = COALESCE(EXCLUDED.phone, users.phone);

        -- Create store_membership for multi-store support
        INSERT INTO store_memberships (user_id, store_id, role, is_default)
        VALUES (v_user_id, v_store_id, 'owner', TRUE)
        ON CONFLICT (user_id, store_id) DO UPDATE
        SET is_default = TRUE;

        -- Create default subscription (free plan)
        INSERT INTO user_subscriptions (user_id, plan_id, status)
        VALUES (v_user_id, 'free', 'active')
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- User already has a store, just update it
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

        -- Ensure store_membership exists
        INSERT INTO store_memberships (user_id, store_id, role, is_default)
        VALUES (v_user_id, v_store_id, 'owner', TRUE)
        ON CONFLICT (user_id, store_id) DO UPDATE
        SET is_default = TRUE;
    END IF;

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

-- Revoke from anon to prevent unauthenticated access
REVOKE EXECUTE ON FUNCTION complete_store_onboarding(VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN) FROM anon;
