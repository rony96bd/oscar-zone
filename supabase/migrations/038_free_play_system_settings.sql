-- ============================================================
-- 038_free_play_system_settings.sql
-- Settings for Free Play eligibility modes:
-- 1. 'deposit_based': unlocked by deposit amount (e.g. $10)
-- 2. 'daily_limit': admin-configured max requests per customer per day
-- ============================================================

INSERT INTO system_settings (key, value, description)
VALUES 
    ('free_play_mode', 'deposit_based', 'Free play eligibility system mode: deposit_based or daily_limit'),
    ('free_play_daily_limit', '1', 'Daily limit for free play requests per customer when in daily_limit mode'),
    ('free_play_deposit_requirement', '10', 'Deposit amount required to unlock a free play request in deposit_based mode')
ON CONFLICT (key) DO NOTHING;
