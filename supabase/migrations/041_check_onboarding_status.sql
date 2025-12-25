-- Fix: Create RPC function to check onboarding status (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_onboarding_status()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_store_id UUID;
  v_onboarding_completed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'authenticated', false,
      'needs_onboarding', true
    );
  END IF;
  
  -- Get user's store_id
  SELECT store_id INTO v_store_id
  FROM users
  WHERE id = v_user_id;
  
  IF v_store_id IS NULL THEN
    RETURN json_build_object(
      'authenticated', true,
      'has_store', false,
      'needs_onboarding', true
    );
  END IF;
  
  -- Get store onboarding status
  SELECT onboarding_completed INTO v_onboarding_completed
  FROM stores
  WHERE id = v_store_id;
  
  RETURN json_build_object(
    'authenticated', true,
    'has_store', true,
    'store_id', v_store_id,
    'onboarding_completed', COALESCE(v_onboarding_completed, false),
    'needs_onboarding', NOT COALESCE(v_onboarding_completed, false)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_onboarding_status() TO authenticated;
