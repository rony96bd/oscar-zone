-- ============================================================
-- STAFF PERMISSIONS
-- Add a JSONB permissions column to profiles for staff/support_agent roles
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON profiles USING gin(permissions);
