-- Subscription Plans System
-- Admin-only table for managing subscription tiers
-- ============================================================================

-- Drop old approach (max_stores in users table)
ALTER TABLE users DROP COLUMN IF EXISTS max_stores;
DROP FUNCTION IF EXISTS admin_set_user_max_stores(UUID, INTEGER);
DROP TRIGGER IF EXISTS protect_max_stores_trigger ON users;
DROP FUNCTION IF EXISTS prevent_max_stores_update();

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE (Admin-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY,  -- 'free', 'basic', 'pro', etc.
  name VARCHAR(100) NOT NULL,
  max_stores INTEGER NOT NULL DEFAULT 1,
  max_users_per_store INTEGER DEFAULT 5,
  max_products INTEGER DEFAULT 100,
  features JSONB DEFAULT '{}',  -- Extensible: {"e_invoice": true, "reports": true, ...}
  price_monthly INTEGER DEFAULT 0,  -- VND
  price_yearly INTEGER DEFAULT 0,   -- VND
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, max_stores, max_users_per_store, max_products, price_monthly, sort_order) VALUES
  ('free', 'Miễn phí', 1, 3, 50, 0, 1),
  ('basic', 'Cơ bản', 2, 5, 200, 99000, 2),
  ('pro', 'Chuyên nghiệp', 5, 20, 1000, 299000, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- USER SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- subscription_plans: Everyone can read, no one can modify via client
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE);

-- user_subscriptions: Users can only view their own
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for clients - admin only via service_role

-- ============================================================================
-- HELPER FUNCTION: Get user's max stores
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_max_stores(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_max_stores INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT COALESCE(sp.max_stores, 1) INTO v_max_stores
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = v_user_id
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > NOW());
  
  -- Default to free plan limit if no subscription found
  IF v_max_stores IS NULL THEN
    SELECT max_stores INTO v_max_stores 
    FROM subscription_plans 
    WHERE id = 'free';
  END IF;
  
  RETURN COALESCE(v_max_stores, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- UPDATE create_user_store TO USE NEW SYSTEM
-- ============================================================================

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
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get max stores from subscription
  v_max_stores := get_user_max_stores(v_user_id);
  
  -- Count current stores
  SELECT COUNT(*) INTO v_store_count
  FROM store_memberships
  WHERE user_id = v_user_id;
  
  IF v_store_count >= v_max_stores THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Đã đạt giới hạn số cửa hàng',
      'max_stores', v_max_stores,
      'current_count', v_store_count
    );
  END IF;
  
  -- Create the new store
  INSERT INTO stores (name, phone)
  VALUES (p_store_name, p_phone)
  RETURNING id INTO v_store_id;
  
  -- Add user as owner
  INSERT INTO store_memberships (user_id, store_id, role, is_default)
  VALUES (v_user_id, v_store_id, 'owner', FALSE);
  
  RETURN json_build_object(
    'success', true,
    'store_id', v_store_id,
    'store_name', p_store_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADMIN FUNCTIONS (service_role only)
-- ============================================================================

-- Set user's subscription plan
CREATE OR REPLACE FUNCTION admin_set_user_plan(
  p_user_id UUID,
  p_plan_id VARCHAR(50),
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  -- Verify plan exists
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
    RETURN json_build_object('success', false, 'error', 'Plan not found');
  END IF;
  
  -- Upsert subscription
  INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, updated_at)
  VALUES (p_user_id, p_plan_id, 'active', p_expires_at, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = p_plan_id,
    status = 'active',
    expires_at = p_expires_at,
    updated_at = NOW();
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'plan_id', p_plan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REVOKE from authenticated - only service_role can call
REVOKE EXECUTE ON FUNCTION admin_set_user_plan(UUID, VARCHAR, TIMESTAMPTZ) FROM authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_user_plan(UUID, VARCHAR, TIMESTAMPTZ) FROM anon;

-- Create default subscription for existing users
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT id, 'free', 'active'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Upgrade users who already have 2+ stores to basic plan
UPDATE user_subscriptions us
SET plan_id = 'basic', updated_at = NOW()
WHERE (
  SELECT COUNT(*) FROM store_memberships sm WHERE sm.user_id = us.user_id
) > 1
AND us.plan_id = 'free';
