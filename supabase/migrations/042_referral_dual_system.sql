-- ============================================================
-- 042: DUAL REFERRAL SYSTEM — COMMISSION & CUSTOM MANUAL BONUS
-- ============================================================

-- 1. Make source_order_id and commission-specific columns nullable in referral_earnings
-- to allow manual/custom bonus awards from admin without requiring a game load order.
ALTER TABLE referral_earnings ALTER COLUMN source_order_id DROP NOT NULL;
ALTER TABLE referral_earnings ALTER COLUMN deposit_amount DROP NOT NULL;
ALTER TABLE referral_earnings ALTER COLUMN deposit_amount SET DEFAULT 0;
ALTER TABLE referral_earnings ALTER COLUMN commission_percentage DROP NOT NULL;
ALTER TABLE referral_earnings ALTER COLUMN commission_percentage SET DEFAULT 0;
ALTER TABLE referral_earnings ALTER COLUMN level DROP NOT NULL;
ALTER TABLE referral_earnings ALTER COLUMN level SET DEFAULT 0;

-- 2. Add earning_type and notes columns to referral_earnings
ALTER TABLE referral_earnings ADD COLUMN IF NOT EXISTS earning_type TEXT NOT NULL DEFAULT 'commission';
ALTER TABLE referral_earnings ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add custom bonus tracking columns to referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS custom_bonus_amount NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS custom_bonus_status TEXT DEFAULT 'pending';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS custom_bonus_note TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS custom_bonus_awarded_at TIMESTAMPTZ;

-- 4. Seed system settings for referral dual system
INSERT INTO system_settings (key, value, description)
VALUES 
  ('referral_commission_enabled', 'true', 'Enable/disable automatic tier commission on player game load orders'),
  ('referral_custom_bonus_enabled', 'true', 'Enable/disable manual custom bonus rewards for referrers'),
  ('referral_default_custom_bonus', '10', 'Default bonus amount ($) for custom referral rewards')
ON CONFLICT (key) DO UPDATE SET 
  description = EXCLUDED.description;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_earnings_earning_type ON referral_earnings(earning_type);
CREATE INDEX IF NOT EXISTS idx_referrals_custom_bonus_status ON referrals(custom_bonus_status);
