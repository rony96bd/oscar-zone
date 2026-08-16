-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_bonus_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;

-- Helper function: is user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'support_agent')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_super_admin())
  WITH CHECK (auth.uid() = id OR is_super_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_super_admin());

-- ============================================================
-- GAMES
-- ============================================================
CREATE POLICY "Anyone can view active games"
  ON games FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage games"
  ON games FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- CUSTOMER GAMES
-- ============================================================
CREATE POLICY "Customers can view their own games"
  ON customer_games FOR SELECT
  USING (customer_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage customer games"
  ON customer_games FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
CREATE POLICY "Anyone can view active payment methods"
  ON payment_methods FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage payment methods"
  ON payment_methods FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- PROMOTIONS
-- ============================================================
CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage promotions"
  ON promotions FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY "Customers can view their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid() OR is_admin() OR is_guest = true);

CREATE POLICY "Anyone can insert orders (including guests)"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- ORDER BONUS SNAPSHOTS
-- ============================================================
CREATE POLICY "Customers can view their own snapshots"
  ON order_bonus_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_bonus_snapshots.order_id
      AND (orders.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "System can insert snapshots"
  ON order_bonus_snapshots FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================
CREATE POLICY "Customers can view their order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND (orders.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "System can insert status history"
  ON order_status_history FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- REFERRAL LEVELS
-- ============================================================
CREATE POLICY "Anyone can view referral levels"
  ON referral_levels FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage referral levels"
  ON referral_levels FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR is_admin());

CREATE POLICY "System can insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update referrals"
  ON referrals FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- REFERRAL EARNINGS
-- ============================================================
CREATE POLICY "Users can view their own earnings"
  ON referral_earnings FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System can insert earnings"
  ON referral_earnings FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- REFERRAL MILESTONES
-- ============================================================
CREATE POLICY "Anyone can view milestones"
  ON referral_milestones FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage milestones"
  ON referral_milestones FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- CHAT CONVERSATIONS
-- ============================================================
CREATE POLICY "Customers can view their own conversations"
  ON chat_conversations FOR SELECT
  USING (customer_id = auth.uid() OR is_admin());

CREATE POLICY "Customers can create conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can update conversations"
  ON chat_conversations FOR UPDATE
  USING (is_admin() OR customer_id = auth.uid())
  WITH CHECK (is_admin() OR customer_id = auth.uid());

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE POLICY "Participants can view messages"
  ON chat_messages FOR SELECT
  USING (
    sender_id = auth.uid() OR
    is_admin() OR
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.customer_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    sender_id = auth.uid()
  );

-- ============================================================
-- BANNERS & ANNOUNCEMENTS
-- ============================================================
CREATE POLICY "Anyone can view active banners"
  ON banners FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Anyone can view active announcements"
  ON announcements FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- TELEGRAM DESTINATIONS
-- ============================================================
CREATE POLICY "Admins can manage telegram destinations"
  ON telegram_destinations FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE POLICY "Anyone can view settings"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON system_settings FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- CUSTOMER NOTES
-- ============================================================
CREATE POLICY "Admins can manage customer notes"
  ON customer_notes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- FRAUD FLAGS
-- ============================================================
CREATE POLICY "Admins can manage fraud flags"
  ON fraud_flags FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
