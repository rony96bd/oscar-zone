-- ============================================================
-- 039_customer_custom_free_play_limit.sql
-- Add custom_free_play_limit to profiles table
-- NULL = follows global setting
-- >= 0 = custom daily free play requests allowed per day for this customer
-- ============================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS custom_free_play_limit INT DEFAULT NULL;

COMMENT ON COLUMN profiles.custom_free_play_limit IS 'Customer-specific daily free play request limit. NULL means inherit global setting. 0 disables free plays for this customer.';
