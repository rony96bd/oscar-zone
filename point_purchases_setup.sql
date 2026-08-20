CREATE TABLE IF NOT EXISTS game_point_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE game_point_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view game point purchases"
  ON game_point_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert game point purchases"
  ON game_point_purchases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
ALTER TABLE accounting_cycles ADD COLUMN IF NOT EXISTS total_game_points_cost numeric NOT NULL DEFAULT 0;
