-- ============================================================
-- Migration 005: R2 storage, system settings, fraud flags,
--                customer notes, announcements
-- ============================================================

-- ── Orders: rename screenshot field to R2 key ───────────────
-- Add new R2 key column
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_screenshot_key TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS screenshot_retention_days INTEGER;

-- If old column exists, migrate data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_screenshot_path'
  ) THEN
    UPDATE orders SET payment_screenshot_key = payment_screenshot_path
      WHERE payment_screenshot_path IS NOT NULL AND payment_screenshot_key IS NULL;
    ALTER TABLE orders DROP COLUMN payment_screenshot_path;
  END IF;
END$$;

-- ── System Settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '""',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('site_name', '"OscarZone"', 'Site display name'),
  ('default_bonus_percentage', '10', 'Default bonus % for all loads'),
  ('registration_enabled', 'true', 'Allow new user registration'),
  ('maintenance_mode', 'false', 'Put site in maintenance mode'),
  ('max_screenshot_size_mb', '10', 'Max screenshot upload size in MB'),
  ('support_email', '"support@oscarzone.com"', 'Support contact email'),
  ('support_phone', '"+1 (555) 000-0000"', 'Support phone number'),
  ('screenshot_retention_completed_days', '60', 'Days to keep completed order screenshots'),
  ('screenshot_retention_rejected_days', '30', 'Days to keep rejected order screenshots'),
  ('screenshot_retention_cancelled_days', '30', 'Days to keep cancelled order screenshots'),
  ('referral_qualification_min_amount', '20', 'Min load amount to qualify a referral'),
  ('chat_enabled', 'true', 'Enable live chat feature'),
  ('telegram_enabled', 'true', 'Enable Telegram notifications')
ON CONFLICT (key) DO NOTHING;

-- ── Fraud Flags ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  flag_type TEXT NOT NULL, -- 'self_referral', 'duplicate_account', 'suspicious_pattern', etc.
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'reviewed', 'dismissed', 'actioned'
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON fraud_flags(status);

-- ── Customer Notes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);

-- ── Announcements ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  banner_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  target_roles TEXT[] DEFAULT ARRAY['customer'],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, start_date, end_date);

-- ── VIP Customers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vip_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  vip_bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  vip_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Logs (enhanced) ────────────────────────────────────
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id UUID,
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Add missing columns if audit_logs doesn't exist yet
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  previous_value JSONB,
  new_value JSONB,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ── RLS for new tables ───────────────────────────────────────
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- System settings: admin read/write only
CREATE POLICY "admin_read_settings" ON system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "admin_write_settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Fraud flags: admin only
CREATE POLICY "admin_fraud_flags" ON fraud_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'support_agent')
    )
  );

-- Customer notes: admin only
CREATE POLICY "admin_customer_notes" ON customer_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'support_agent')
    )
  );

-- Announcements: admin write, all read
CREATE POLICY "all_read_announcements" ON announcements
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "admin_write_announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- VIP customers: admin write, customer read own
CREATE POLICY "customer_read_own_vip" ON vip_customers
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "admin_write_vip" ON vip_customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Audit logs: admin read only
CREATE POLICY "admin_read_audit" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "service_write_audit" ON audit_logs
  FOR INSERT WITH CHECK (TRUE); -- Edge functions with service role bypass RLS

-- ── Telegram destinations: add is_active if missing ──────────
ALTER TABLE telegram_destinations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Update order R2 key RLS ──────────────────────────────────
-- Customers can read their own orders (key is not exposed directly)
-- Screenshot access must go through r2-get-signed-url edge function
