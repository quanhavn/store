-- Fix: Allow users to create their first membership during onboarding
-- ============================================================================

-- Add policy to allow users to insert their OWN first membership
-- This is needed for onboarding when user doesn't have any memberships yet
CREATE POLICY "Users can create own first membership"
  ON store_memberships FOR INSERT
  WITH CHECK (
    -- Only for the current user
    user_id = auth.uid()
    AND
    -- Only if they own the store via users.store_id
    store_id IN (SELECT store_id FROM users WHERE id = auth.uid())
  );

-- Also allow users to update their own membership (e.g., is_default flag)
CREATE POLICY "Users can update own membership"
  ON store_memberships FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
