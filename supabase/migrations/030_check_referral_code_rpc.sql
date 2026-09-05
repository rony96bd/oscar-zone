-- ============================================================
-- 030: Public RPC to validate a referral code during signup
-- Runs as SECURITY DEFINER so unauthenticated users can call it
-- without needing read access to the profiles table.
-- Returns TRUE if a valid customer account owns that code.
-- ============================================================

CREATE OR REPLACE FUNCTION check_referral_code(code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE lower(referral_code) = lower(trim(code))
      AND role = 'customer'
      AND account_status != 'suspended'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Allow anyone (including anon/unauthenticated) to call this function
GRANT EXECUTE ON FUNCTION check_referral_code(TEXT) TO anon, authenticated;
