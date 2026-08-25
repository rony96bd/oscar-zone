-- Add RLS policies for accounting tables
ALTER TABLE accounting_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access accounting_cycles" ON accounting_cycles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE game_point_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access game_point_purchases" ON game_point_purchases FOR ALL USING (is_admin()) WITH CHECK (is_admin());

