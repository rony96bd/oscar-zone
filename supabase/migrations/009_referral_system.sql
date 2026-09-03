-- ============================================================
-- 009: REFERRAL SYSTEM — LEVELS, SETTINGS, QUALIFICATION
-- ============================================================

-- 1. Referral qualification settings
INSERT INTO system_settings (key, value) VALUES 
  ('referral_qualify_on', '"first_completed_load"'),
  ('referral_min_load_amount', '5')
ON CONFLICT (key) DO NOTHING;

-- 2. Seed default referral levels (if not already seeded)
INSERT INTO referral_levels (level, min_referrals, max_referrals, commission_percentage, label)
VALUES 
  (1, 1, 10, 2, 'Starter'),
  (2, 11, 20, 5, 'Pro'),
  (3, 21, 30, 10, 'Elite')
ON CONFLICT (level) DO NOTHING;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON referral_earnings(status);
