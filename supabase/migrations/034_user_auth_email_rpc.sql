-- ============================================================
-- 034: RESOLVE AUTH EMAIL BY USERNAME OR EMAIL RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_auth_email(login_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean TEXT := lower(trim(login_input));
  v_email TEXT;
BEGIN
  IF v_clean IS NULL OR v_clean = '' THEN
    RETURN NULL;
  END IF;

  -- 1. Try to find by username in profiles
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(trim(username)) = v_clean
  LIMIT 1;

  IF v_email IS NOT NULL AND v_email != '' THEN
    RETURN v_email;
  END IF;

  -- 2. Try to find by email in profiles
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(trim(email)) = v_clean
  LIMIT 1;

  IF v_email IS NOT NULL AND v_email != '' THEN
    RETURN v_email;
  END IF;

  -- 3. Check auth.users directly
  SELECT email INTO v_email
  FROM auth.users
  WHERE lower(trim(email)) = v_clean
  LIMIT 1;

  RETURN v_email;
END;
$$;

-- Allow anonymous visitors on login page to resolve their login email
GRANT EXECUTE ON FUNCTION public.get_user_auth_email(TEXT) TO anon, authenticated;
