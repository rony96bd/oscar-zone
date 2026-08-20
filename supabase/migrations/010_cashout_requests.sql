-- ============================================================
-- 010: CASHOUT REQUESTS
-- ============================================================

CREATE TABLE cashout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL DEFAULT 'CSH-' || upper(substring(gen_random_uuid()::text from 1 for 8)),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  game_username TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method_name TEXT NOT NULL,
  payment_detail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cashout_user ON cashout_requests(user_id);
CREATE INDEX idx_cashout_status ON cashout_requests(status);
CREATE INDEX idx_cashout_created ON cashout_requests(created_at DESC);

ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view their own requests
CREATE POLICY "Users can view own cashout requests"
  ON cashout_requests FOR SELECT
  USING (user_id = auth.uid());

-- Customers can insert their own requests
CREATE POLICY "Users can create cashout requests"
  ON cashout_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all (via service role - Edge Functions)
-- Admins can update status (via service role - Edge Functions)
