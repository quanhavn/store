-- Fix: Add store_membership creation during registration
-- ============================================================================

CREATE OR REPLACE FUNCTION register_store_and_user(
    p_store_name VARCHAR(255),
    p_phone VARCHAR(20)
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
        RAISE EXCEPTION 'User must be authenticated to register';
    END IF;

    -- Check if user already has a profile
    IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'User profile already exists';
    END IF;

    -- Create the store
    INSERT INTO stores (name, phone)
    VALUES (p_store_name, p_phone)
    RETURNING id INTO v_store_id;

    -- Create the user profile linked to the store
    INSERT INTO users (id, store_id, name, phone, role)
    VALUES (v_user_id, v_store_id, p_store_name, p_phone, 'owner');

    -- Create store_membership for multi-store support
    INSERT INTO store_memberships (user_id, store_id, role, is_default)
    VALUES (v_user_id, v_store_id, 'owner', TRUE)
    ON CONFLICT (user_id, store_id) DO NOTHING;

    -- Create default subscription (free plan)
    INSERT INTO user_subscriptions (user_id, plan_id, status)
    VALUES (v_user_id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    -- Return the created IDs
    v_result := json_build_object(
        'success', true,
        'store_id', v_store_id,
        'user_id', v_user_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION register_store_and_user(VARCHAR, VARCHAR) TO authenticated;

-- Revoke from anon to prevent unauthenticated access
REVOKE EXECUTE ON FUNCTION register_store_and_user(VARCHAR, VARCHAR) FROM anon;
