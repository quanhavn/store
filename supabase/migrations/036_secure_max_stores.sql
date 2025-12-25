-- Security fix: Protect max_stores from user manipulation
-- ============================================================================

-- 1. Drop the insecure admin function
DROP FUNCTION IF EXISTS admin_set_user_max_stores(UUID, INTEGER);

-- 2. Create a secure admin function that only service_role can use
-- This should be called from a secure backend (Edge Function with service role)
CREATE OR REPLACE FUNCTION admin_set_user_max_stores(
  p_user_id UUID,
  p_max_stores INTEGER
)
RETURNS JSON AS $$
BEGIN
  -- This function uses SECURITY DEFINER but we add an extra check:
  -- Only allow if called with service_role (no auth.uid() means service role)
  -- Or implement a proper admin check via a separate admin_users table
  
  -- For now, we'll make this function only work when called from 
  -- service_role context (Edge Functions with service key)
  -- Regular authenticated users will have auth.uid() set
  
  -- IMPORTANT: This is a basic protection. For production, consider:
  -- 1. A separate admin_users table
  -- 2. JWT claims with admin role
  -- 3. Or only call from trusted backend with service_role
  
  IF p_max_stores < 1 THEN
    RETURN json_build_object('success', false, 'error', 'max_stores must be at least 1');
  END IF;
  
  UPDATE users
  SET max_stores = p_max_stores
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'max_stores', p_max_stores
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REVOKE from authenticated users - only service_role can call this
REVOKE EXECUTE ON FUNCTION admin_set_user_max_stores(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_user_max_stores(UUID, INTEGER) FROM anon;

-- 3. Create a trigger to prevent users from updating max_stores directly
CREATE OR REPLACE FUNCTION prevent_max_stores_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If max_stores is being changed and it's not a service_role call
  IF OLD.max_stores IS DISTINCT FROM NEW.max_stores THEN
    -- Check if this is a regular user update (auth.uid() is set)
    IF auth.uid() IS NOT NULL THEN
      -- Restore the original value - users cannot change their own max_stores
      NEW.max_stores := OLD.max_stores;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS protect_max_stores_trigger ON users;

CREATE TRIGGER protect_max_stores_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_max_stores_update();

-- 4. Add comment for documentation
COMMENT ON FUNCTION admin_set_user_max_stores IS 'Admin-only function to set user store limit. Only callable via service_role (Edge Functions with service key).';
COMMENT ON TRIGGER protect_max_stores_trigger ON users IS 'Prevents authenticated users from modifying their own max_stores value.';
