-- ============================================================
-- 015: CASHOUT RULES & POLICY
-- ============================================================

-- Cashout Rules Table
CREATE TABLE IF NOT EXISTS cashout_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deposit_min NUMERIC(10,2) NOT NULL,       -- Loaded Amount range start
  deposit_max NUMERIC(10,2) NOT NULL,       -- Loaded Amount range end
  min_type TEXT NOT NULL DEFAULT 'fixed' CHECK (min_type IN ('fixed', 'multiplier')),
  min_fixed NUMERIC(10,2),                  -- Fixed minimum cashout amount (e.g., 60.00)
  min_multiplier NUMERIC(5,2),              -- Multiplier (e.g., 3 means loaded_amount x 3)
  max_multiplier NUMERIC(5,2) NOT NULL DEFAULT 12, -- Maximum = deposit x this
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cashout Policy Terms & Conditions (stored as system_settings)
-- We'll use system_settings key: 'cashout_terms'

-- Seed default rules from the image
INSERT INTO cashout_rules (deposit_min, deposit_max, min_type, min_fixed, min_multiplier, max_multiplier, sort_order)
VALUES
  (1,   10,  'fixed',      60,   NULL, 12, 1),
  (11,  20,  'fixed',      70,   NULL, 12, 2),
  (21,  30,  'multiplier', NULL, 3,    12, 3),
  (31,  40,  'multiplier', NULL, 3,    12, 4),
  (41,  50,  'multiplier', NULL, 3,    12, 5),
  (50,  100, 'multiplier', NULL, 3,    12, 6),
  (100, 200, 'multiplier', NULL, 3,    12, 7)
ON CONFLICT DO NOTHING;

-- Insert default cashout terms if not already set
INSERT INTO system_settings (key, value)
VALUES ('cashout_terms', '• Scores over max will be wiped or voided.\n• If you win without loading any amount you can not redeem.\n• We are not responsible for any kind of game malfunctions and servers issues since we do not control the games.')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE cashout_rules ENABLE ROW LEVEL SECURITY;

-- Anyone (logged in) can read rules
CREATE POLICY "Authenticated users can view cashout rules"
  ON cashout_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can manage rules
CREATE POLICY "Admins can manage cashout rules"
  ON cashout_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));
