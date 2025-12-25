-- Multi-store support migration
-- Allows users to belong to multiple stores with different roles

-- Create store_memberships table
CREATE TABLE IF NOT EXISTS store_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_store_memberships_user_id ON store_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_store_memberships_store_id ON store_memberships(store_id);

-- Enable RLS
ALTER TABLE store_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can see their own memberships
CREATE POLICY "Users can view their own memberships"
  ON store_memberships FOR SELECT
  USING (user_id = auth.uid());

-- Owners/managers can manage memberships for their stores
CREATE POLICY "Owners and managers can manage memberships"
  ON store_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM store_memberships sm
      WHERE sm.store_id = store_memberships.store_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'manager')
    )
  );

-- Migrate existing users to store_memberships
INSERT INTO store_memberships (user_id, store_id, role, is_default)
SELECT id, store_id, COALESCE(role, 'staff'), true
FROM users
WHERE store_id IS NOT NULL
ON CONFLICT (user_id, store_id) DO NOTHING;

-- Function to switch user's current store
CREATE OR REPLACE FUNCTION switch_user_store(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_membership record;
  v_store record;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify user has access to this store
  SELECT sm.*, s.name as store_name
  INTO v_membership
  FROM store_memberships sm
  JOIN stores s ON s.id = sm.store_id
  WHERE sm.user_id = v_user_id AND sm.store_id = p_store_id;
  
  IF v_membership IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Access denied to this store');
  END IF;
  
  -- Update user's current store_id and role
  UPDATE users
  SET store_id = p_store_id,
      role = v_membership.role
  WHERE id = v_user_id;
  
  -- Update is_default flags
  UPDATE store_memberships
  SET is_default = (store_id = p_store_id)
  WHERE user_id = v_user_id;
  
  -- Get updated store info
  SELECT * INTO v_store FROM stores WHERE id = p_store_id;
  
  RETURN json_build_object(
    'success', true,
    'store', json_build_object(
      'id', v_store.id,
      'name', v_store.name,
      'role', v_membership.role
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION switch_user_store(uuid) TO authenticated;
