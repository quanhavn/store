-- Migrate all existing users to basic plan
-- ============================================================================

-- Update all user_subscriptions to basic plan
UPDATE user_subscriptions
SET plan_id = 'basic',
    status = 'active',
    updated_at = NOW()
WHERE plan_id != 'basic';

-- Insert basic plan for any users who don't have a subscription yet
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT id, 'basic', 'active'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = auth.users.id
)
ON CONFLICT (user_id) DO UPDATE SET
  plan_id = 'basic',
  status = 'active',
  updated_at = NOW();
