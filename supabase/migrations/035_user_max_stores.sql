-- Add max_stores column to users table for subscription-based store limits
-- Default: 1 store (free tier), can be upgraded to 2+ via admin
-- ============================================================================

-- Add max_stores column with default of 1
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_stores INTEGER NOT NULL DEFAULT 1;

-- Add check constraint to ensure max_stores is at least 1
ALTER TABLE users ADD CONSTRAINT users_max_stores_check CHECK (max_stores >= 1);

-- Update existing users who already have 2 stores to have max_stores = 2
UPDATE users u
SET max_stores = 2
WHERE (
  SELECT COUNT(*) FROM store_memberships sm WHERE sm.user_id = u.id
) > 1;

-- Update create_user_store function to use dynamic limit from users table
CREATE OR REPLACE FUNCTION create_user_store(
  p_store_name VARCHAR(255),
  p_phone VARCHAR(20) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_store_count INTEGER;
  v_store_id UUID;
  v_max_stores INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get user's max_stores limit from users table
  SELECT COALESCE(max_stores, 1) INTO v_max_stores
  FROM users
  WHERE id = v_user_id;
  
  -- Default to 1 if user not found
  IF v_max_stores IS NULL THEN
    v_max_stores := 1;
  END IF;
  
  -- Check store count
  SELECT COUNT(*) INTO v_store_count
  FROM store_memberships
  WHERE user_id = v_user_id;
  
  IF v_store_count >= v_max_stores THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Maximum stores limit reached',
      'max_stores', v_max_stores,
      'current_count', v_store_count
    );
  END IF;
  
  -- Create the new store
  INSERT INTO stores (name, phone)
  VALUES (p_store_name, p_phone)
  RETURNING id INTO v_store_id;
  
  -- Add user as owner of the new store
  INSERT INTO store_memberships (user_id, store_id, role, is_default)
  VALUES (v_user_id, v_store_id, 'owner', FALSE);
  
  -- Return success with new store info
  RETURN json_build_object(
    'success', true,
    'store_id', v_store_id,
    'store_name', p_store_name,
    'message', 'Store created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admin to update user's max_stores (for subscription management)
CREATE OR REPLACE FUNCTION admin_set_user_max_stores(
  p_user_id UUID,
  p_max_stores INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Only allow admins (check if caller has admin role in any store they own)
  SELECT role INTO v_caller_role
  FROM users
  WHERE id = auth.uid();
  
  -- For now, only allow owner role to manage this (can be refined later)
  IF v_caller_role != 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_set_user_max_stores(UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN users.max_stores IS 'Maximum number of stores this user can create. Default 1 (free tier), 2+ for paid subscriptions.';
