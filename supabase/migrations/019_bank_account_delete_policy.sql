-- Add DELETE policy for bank_accounts table
-- Allows managers/owners to delete bank accounts from their store

CREATE POLICY "Managers can delete bank accounts" ON bank_accounts
    FOR DELETE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );
