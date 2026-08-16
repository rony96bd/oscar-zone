-- ============================================================
-- GAMING PORTAL - COMPLETE DATABASE SCHEMA
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','super_admin','support_agent')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended','restricted')),
  referral_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(gen_random_uuid()::text from 1 for 8)),
  referred_by UUID REFERENCES profiles(id),
  is_vip BOOLEAN NOT NULL DEFAULT false,
  custom_bonus_percentage NUMERIC(5,2),
  notes TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by);

-- ============================================================
-- GAMES
-- ============================================================
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  download_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  minimum_amount NUMERIC(10,2) NOT NULL DEFAULT 10,
  maximum_amount NUMERIC(10,2) NOT NULL DEFAULT 1000,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_games_is_active ON games(is_active);
CREATE INDEX idx_games_sort_order ON games(sort_order);

-- ============================================================
-- CUSTOMER GAMES (saved game accounts per player)
-- ============================================================
CREATE TABLE customer_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  game_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, game_id, username)
);

CREATE INDEX idx_customer_games_customer ON customer_games(customer_id);
CREATE INDEX idx_customer_games_game ON customer_games(game_id);
CREATE INDEX idx_customer_games_status ON customer_games(status);

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE TABLE payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  qr_code_url TEXT,
  tag TEXT,
  payment_link TEXT,
  account_name TEXT,
  instructions TEXT,
  minimum_amount NUMERIC(10,2) NOT NULL DEFAULT 10,
  maximum_amount NUMERIC(10,2) NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active);

-- ============================================================
-- PROMOTIONS
-- ============================================================
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  type TEXT NOT NULL DEFAULT 'regular' CHECK (type IN ('regular','daily','first_load','weekend','vip','game_specific','customer_specific')),
  bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  minimum_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  maximum_amount NUMERIC(10,2),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  start_time TIME,
  end_time TIME,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER,
  is_once_per_day BOOLEAN NOT NULL DEFAULT false,
  applicable_game_ids UUID[],
  applicable_customer_ids UUID[],
  is_vip_only BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_type ON promotions(type);
CREATE INDEX idx_promotions_priority ON promotions(priority DESC);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL DEFAULT 'ORD-' || upper(substring(gen_random_uuid()::text from 1 for 8)),
  user_id UUID REFERENCES profiles(id),
  customer_game_id UUID REFERENCES customer_games(id),
  game_id UUID NOT NULL REFERENCES games(id),
  username TEXT NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL CHECK (base_amount > 0),
  regular_bonus_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  regular_bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_bonus_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  promo_bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_game_credit NUMERIC(10,2) NOT NULL,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  payment_screenshot_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment_review' CHECK (
    status IN ('pending_payment_review','payment_verified','processing','completed','rejected','cancelled','refunded')
  ),
  assigned_agent_id UUID REFERENCES profiles(id),
  admin_note TEXT,
  rejection_reason TEXT,
  promotion_id UUID REFERENCES promotions(id),
  is_guest BOOLEAN NOT NULL DEFAULT false,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_game_id ON orders(game_id);
CREATE INDEX idx_orders_is_guest ON orders(is_guest);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_method ON orders(payment_method_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- ============================================================
-- ORDER BONUS SNAPSHOTS (immutable)
-- ============================================================
CREATE TABLE order_bonus_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  base_amount NUMERIC(10,2) NOT NULL,
  regular_bonus_pct NUMERIC(5,2) NOT NULL,
  regular_bonus_amount NUMERIC(10,2) NOT NULL,
  promotion_name TEXT,
  promo_bonus_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  promo_bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_bonus_amount NUMERIC(10,2) NOT NULL,
  final_game_credit NUMERIC(10,2) NOT NULL,
  bonus_rule_applied TEXT,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- ============================================================
-- REFERRAL LEVELS
-- ============================================================
CREATE TABLE referral_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER UNIQUE NOT NULL,
  min_referrals INTEGER NOT NULL,
  max_referrals INTEGER,
  commission_percentage NUMERIC(5,2) NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','disqualified')),
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id),
  CHECK (referrer_id != referred_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ============================================================
-- REFERRAL EARNINGS (immutable ledger)
-- ============================================================
CREATE TABLE referral_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  referral_id UUID NOT NULL REFERENCES referrals(id),
  source_order_id UUID NOT NULL REFERENCES orders(id),
  deposit_amount NUMERIC(10,2) NOT NULL,
  commission_percentage NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  level INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_earnings_user ON referral_earnings(user_id);
CREATE INDEX idx_referral_earnings_referral ON referral_earnings(referral_id);
CREATE INDEX idx_referral_earnings_order ON referral_earnings(source_order_id);

-- ============================================================
-- REFERRAL MILESTONES
-- ============================================================
CREATE TABLE referral_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  required_referrals INTEGER NOT NULL,
  reward_amount NUMERIC(10,2) NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'bonus_credit' CHECK (reward_type IN ('bonus_credit','cash','percentage')),
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('orders','promotions','referral','support','system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- CHAT CONVERSATIONS
-- ============================================================
CREATE TABLE chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','pending')),
  subject TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_customer INTEGER NOT NULL DEFAULT 0,
  unread_count_agent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_conversations_customer ON chat_conversations(customer_id);
CREATE INDEX idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX idx_chat_conversations_agent ON chat_conversations(assigned_agent_id);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachment_url TEXT,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- ============================================================
-- BANNERS
-- ============================================================
CREATE TABLE banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  type TEXT NOT NULL DEFAULT 'homepage' CHECK (type IN ('homepage','promotion','game','referral','announcement')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  banner_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TELEGRAM DESTINATIONS
-- ============================================================
CREATE TABLE telegram_destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  send_on_new_order BOOLEAN NOT NULL DEFAULT true,
  send_on_status_change BOOLEAN NOT NULL DEFAULT false,
  send_screenshot BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  previous_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CUSTOMER NOTES
-- ============================================================
CREATE TABLE customer_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);

-- ============================================================
-- FRAUD FLAGS
-- ============================================================
CREATE TABLE fraud_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  flag_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: auto-create order status history entry
-- ============================================================
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status != NEW.status) THEN
    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_order_status_change
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ============================================================
-- TRIGGER: update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customer_games_updated_at BEFORE UPDATE ON customer_games FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
