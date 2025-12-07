-- Atomic function to increment bank account balance
-- Prevents race conditions by using UPDATE ... RETURNING in a single statement
CREATE OR REPLACE FUNCTION increment_bank_balance(
  p_bank_account_id UUID,
  p_store_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE bank_accounts
  SET balance = COALESCE(balance, 0) + p_amount
  WHERE id = p_bank_account_id
    AND store_id = p_store_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Atomic function to decrement bank account balance with validation
CREATE OR REPLACE FUNCTION decrement_bank_balance(
  p_bank_account_id UUID,
  p_store_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row and check balance
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM bank_accounts
  WHERE id = p_bank_account_id
    AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE bank_accounts
  SET balance = v_current_balance - p_amount
  WHERE id = p_bank_account_id
    AND store_id = p_store_id
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_bank_balance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION decrement_bank_balance TO authenticated, service_role;
