-- ============================================================
-- 032: Enhanced get_live_activities with status for Transaction Board
-- Shows all statuses (pending, processing, completed) for Cash In
-- Shows pending + approved for Cash Out
-- ============================================================

CREATE OR REPLACE FUNCTION get_live_activities(limit_count INT DEFAULT 10)
RETURNS TABLE (
  activity_type TEXT,
  amount NUMERIC,
  game_name TEXT,
  masked_name TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- CASH IN: all non-cancelled, non-rejected orders
    SELECT * FROM (
      SELECT
        'load'::TEXT as activity_type,
        o.base_amount as amount,
        g.name as game_name,
        (substring(COALESCE(p.username, p.full_name, 'Player') from 1 for 3) || '***')::TEXT as masked_name,
        o.status::TEXT as status,
        o.created_at
      FROM orders o
      JOIN profiles p ON p.id = o.user_id
      JOIN games g ON g.id = o.game_id
      WHERE o.status IN ('pending_payment_review', 'payment_verified', 'processing', 'completed')
        AND p.is_hidden_from_public = false
      ORDER BY o.created_at DESC
      LIMIT limit_count
    ) loads

    UNION ALL

    -- CASH OUT: pending + approved requests
    SELECT * FROM (
      SELECT
        'cashout'::TEXT as activity_type,
        cr.amount as amount,
        cr.game_name as game_name,
        (substring(COALESCE(p.username, p.full_name, 'Player') from 1 for 3) || '***')::TEXT as masked_name,
        cr.status::TEXT as status,
        cr.created_at
      FROM cashout_requests cr
      JOIN profiles p ON p.id = cr.user_id
      WHERE cr.status IN ('pending', 'approved')
        AND p.is_hidden_from_public = false
      ORDER BY cr.created_at DESC
      LIMIT limit_count
    ) cashouts
  ) combined_activities
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
