-- ============================================================
-- 016: ENGAGEMENT, WINNERS CIRCLE & LIVE TICKER
-- ============================================================

-- 1. Add privacy flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_hidden_from_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Testimonials table (Winner's Circle)
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  cashout_request_id UUID REFERENCES cashout_requests(id) ON DELETE SET NULL,
  game_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testimonials_status ON testimonials(status);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Policies for testimonials
CREATE POLICY "Anyone can view approved testimonials" ON testimonials
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view their own testimonials" ON testimonials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create testimonials" ON testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage testimonials" ON testimonials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 3. Live Activities RPC (combines loads and cashouts, masks names)
CREATE OR REPLACE FUNCTION get_live_activities(limit_count INT DEFAULT 10)
RETURNS TABLE (
  activity_type TEXT,
  amount NUMERIC,
  game_name TEXT,
  masked_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Completed Orders (Loads)
    SELECT 
      'load'::TEXT as activity_type,
      o.base_amount as amount,
      g.name as game_name,
      -- Mask logic: First 2 chars + ***
      (substring(COALESCE(p.username, p.full_name, 'Player') from 1 for 2) || '***')::TEXT as masked_name,
      o.created_at
    FROM orders o
    JOIN profiles p ON p.id = o.user_id
    JOIN games g ON g.id = o.game_id
    WHERE o.status = 'completed' AND p.is_hidden_from_public = false

    UNION ALL

    -- Completed Cashouts
    SELECT 
      'cashout'::TEXT as activity_type,
      cr.amount as amount,
      cr.game_name as game_name,
      (substring(COALESCE(p.username, p.full_name, 'Player') from 1 for 2) || '***')::TEXT as masked_name,
      cr.created_at
    FROM cashout_requests cr
    JOIN profiles p ON p.id = cr.user_id
    WHERE cr.status = 'approved' AND p.is_hidden_from_public = false
  ) combined_activities
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
