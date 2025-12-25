-- Fix: Allow users to view all stores they have membership in
-- ============================================================================

-- Drop existing policy that only allows viewing current store
DROP POLICY IF EXISTS "Users can view own store" ON stores;

-- Create new policy that allows viewing any store the user has membership in
CREATE POLICY "Users can view stores they belong to" ON stores
    FOR SELECT USING (
        id IN (
            SELECT store_id FROM store_memberships WHERE user_id = auth.uid()
        )
        OR
        id IN (SELECT store_id FROM users WHERE id = auth.uid())
    );

-- Update the store update policy to work with memberships
DROP POLICY IF EXISTS "Owners can update store" ON stores;

CREATE POLICY "Owners can update their stores" ON stores
    FOR UPDATE USING (
        -- Allow if user is owner via store_memberships
        EXISTS (
            SELECT 1 FROM store_memberships 
            WHERE store_id = stores.id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
        OR
        -- Fallback: allow if this is user's current store and they have owner role
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND store_id = stores.id 
            AND role = 'owner'
        )
    );
