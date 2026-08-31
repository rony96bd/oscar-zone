-- Fix is_admin to ensure support_agent is included
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'support_agent')
  );
$$
LANGUAGE sql SECURITY DEFINER STABLE;

-- Redefine accounting_cycles RLS so staff can only SELECT
DROP POLICY IF EXISTS "Admins can access accounting_cycles" ON accounting_cycles;
CREATE POLICY "Admins can manage accounting_cycles" ON accounting_cycles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Support agents can view accounting_cycles" ON accounting_cycles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'support_agent'));

-- Redefine game_point_purchases RLS so staff can only SELECT
DROP POLICY IF EXISTS "Admins can access game_point_purchases" ON game_point_purchases;
CREATE POLICY "Admins can manage game_point_purchases" ON game_point_purchases FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')));
CREATE POLICY "Support agents can view game_point_purchases" ON game_point_purchases FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'support_agent'));
