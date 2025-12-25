 -- Fix: Infinite recursion in store_memberships RLS policy
 -- ============================================================================
 -- The policy "Owners and managers can manage memberships" queries store_memberships
 -- while checking policy on store_memberships -> infinite recursion
 
 -- Drop the problematic policy
 DROP POLICY IF EXISTS "Owners and managers can manage memberships" ON store_memberships;
 
 -- Create a SECURITY DEFINER function to check membership role (bypasses RLS)
 CREATE OR REPLACE FUNCTION check_store_membership_role(p_store_id UUID, p_user_id UUID)
 RETURNS TEXT AS $$
   SELECT role FROM store_memberships 
   WHERE store_id = p_store_id AND user_id = p_user_id
   LIMIT 1
 $$ LANGUAGE SQL SECURITY DEFINER STABLE;
 
 -- Recreate policy using the function (avoids recursion)
 CREATE POLICY "Owners and managers can manage memberships"
   ON store_memberships FOR ALL
   USING (
     check_store_membership_role(store_id, auth.uid()) IN ('owner', 'manager')
   );
 
 -- Grant execute permission
 GRANT EXECUTE ON FUNCTION check_store_membership_role(UUID, UUID) TO authenticated;
