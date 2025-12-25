-- Create additional store for existing user (max 2 stores)
-- ============================================================================

-- Function to create a new store for current user
CREATE OR REPLACE FUNCTION create_user_store(
  p_store_name VARCHAR(255),
  p_phone VARCHAR(20) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_store_count INTEGER;
  v_store_id UUID;
  v_max_stores INTEGER := 2;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_user_store(VARCHAR, VARCHAR) TO authenticated;
