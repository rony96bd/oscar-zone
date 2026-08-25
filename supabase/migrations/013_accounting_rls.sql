-- Add RLS policies for accounting tables
ALTER TABLE accounting_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access accounting_cycles" ON accounting_cycles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS game_point_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id),
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE game_point_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access game_point_purchases" ON game_point_purchases FOR ALL USING (is_admin()) WITH CHECK (is_admin());

