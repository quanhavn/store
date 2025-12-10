-- Add DELETE policy for bank_book table
-- Required to delete bank_book entries when deleting a bank account

CREATE POLICY "Managers can delete bank book entries" ON bank_book
    FOR DELETE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );
