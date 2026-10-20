-- ============================================================
-- 043: ADMIN EDIT & DELETE FOR ORDERS AND CASHOUT REQUESTS
-- ============================================================

-- 1. Enable RLS and add DELETE policy for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'support_agent')
    )
  );

-- 2. Enable RLS and add DELETE policy for cashout_requests
ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete cashout requests" ON public.cashout_requests;
CREATE POLICY "Admins can delete cashout requests"
  ON public.cashout_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'support_agent')
    )
  );

-- 3. Atomic Database Function to safely delete order and all foreign key references
CREATE OR REPLACE FUNCTION public.admin_delete_order(target_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'super_admin', 'support_agent') THEN
    RAISE EXCEPTION 'Forbidden: Admins only';
  END IF;

  -- Remove referencing records that don't cascade automatically
  DELETE FROM public.referral_earnings WHERE source_order_id = target_order_id;
  DELETE FROM public.fraud_flags WHERE order_id = target_order_id;
  
  -- Delete the order (cascades to order_status_history, order_bonus_snapshots)
  DELETE FROM public.orders WHERE id = target_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Atomic Database Function to safely delete cashout request
CREATE OR REPLACE FUNCTION public.admin_delete_cashout(target_cashout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'super_admin', 'support_agent') THEN
    RAISE EXCEPTION 'Forbidden: Admins only';
  END IF;

  DELETE FROM public.cashout_requests WHERE id = target_cashout_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_delete_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_cashout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_cashout(UUID) TO service_role;
