-- ============================================================
-- 043: ADMIN EDIT & DELETE FOR ORDERS AND CASHOUT REQUESTS
-- ============================================================

-- Allow admins to delete orders via RLS
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (is_admin());

-- Allow admins to delete cashout_requests via RLS
DROP POLICY IF EXISTS "Admins can delete cashout requests" ON cashout_requests;
CREATE POLICY "Admins can delete cashout requests"
  ON cashout_requests FOR DELETE
  USING (is_admin());

-- RPC to safely delete order and all foreign key references
CREATE OR REPLACE FUNCTION admin_delete_order(target_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admins only';
  END IF;

  -- Remove referencing records that don't cascade automatically
  DELETE FROM public.referral_earnings WHERE source_order_id = target_order_id;
  DELETE FROM public.fraud_flags WHERE order_id = target_order_id;
  
  -- Delete the order (cascades to order_status_history, order_bonus_snapshots)
  DELETE FROM public.orders WHERE id = target_order_id;
END;
$$;

-- RPC to safely delete cashout request
CREATE OR REPLACE FUNCTION admin_delete_cashout(target_cashout_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admins only';
  END IF;

  DELETE FROM public.cashout_requests WHERE id = target_cashout_id;
END;
$$;
