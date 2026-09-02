-- ============================================================
-- SEED DATA
-- ============================================================

-- Games
INSERT INTO games (name, slug, download_url, description, minimum_amount, maximum_amount, sort_order, is_active) VALUES
  ('Juwa', 'juwa', 'http://dl.juwa777.com/', 'One of the most popular sweepstakes fish games in the US. Download and load your Juwa account instantly.', 10, 1000, 1, true),
  ('Orion Stars', 'orion-stars', 'http://orionstars.vip:8580/index.html', 'Orion Stars offers an exciting universe of fish table games and slots. Load up and dive in.', 10, 1000, 2, true),
  ('Firekirin', 'firekirin', 'http://firekirin.xyz:8580/index.html', 'Fire Kirin is a legendary fish game platform with huge jackpots and exciting gameplay.', 10, 1000, 3, true),
  ('Milkyway', 'milkyway', 'https://milkywayapp.xyz/', 'Milkyway Casino brings you premium fish table games and slots with real cash prizes.', 10, 1000, 4, true),
  ('Game Vault', 'game-vault', 'http://download.gamevault999.com', 'Game Vault 999 — the ultimate sweepstakes gaming platform with 100+ games available.', 10, 1000, 5, true),
  ('Game Room', 'game-room', 'https://www.gameroom777.com/m', 'Game Room 777 offers the best fish table experience with generous bonuses for loyal players.', 10, 1000, 6, true),
  ('Cash Frenzy', 'cash-frenzy', 'https://www.cashfrenzy777.com/', 'Cash Frenzy Casino delivers non-stop slot action with massive coin rewards and daily bonuses.', 10, 1000, 7, true);

-- Payment Methods (update tags/account names from Admin Panel after setup)
INSERT INTO payment_methods (name, tag, account_name, instructions, minimum_amount, maximum_amount, is_active, sort_order) VALUES
  ('Chime', '$YourChimeTag', 'Your Business Name', E'1. Open your Chime app\n2. Tap "Pay Friends"\n3. Search for our Chime tag\n4. Enter the exact amount\n5. Add your game username in the memo\n6. Screenshot your payment confirmation', 10, 1000, true, 1),
  ('PayPal', '@YourPayPalTag', 'Your Business Name', E'1. Open PayPal\n2. Send payment to Friends & Family (NOT Goods & Services)\n3. Add your game username in the note\n4. Screenshot the payment confirmation', 10, 1000, true, 2),
  ('Cash App', '$YourCashTag', 'Your Business Name', E'1. Open Cash App\n2. Search for our $Cashtag\n3. Enter the exact amount\n4. Add your game username in the note\n5. Screenshot the payment confirmation', 10, 1000, true, 3);

-- Referral Levels
INSERT INTO referral_levels (level, min_referrals, max_referrals, commission_percentage, label) VALUES
  (1, 1, 10, 2.00, 'Starter'),
  (2, 11, 20, 5.00, 'Pro'),
  (3, 21, NULL, 10.00, 'Elite');

-- Referral Milestones
INSERT INTO referral_milestones (required_referrals, reward_amount, reward_type, label, is_active) VALUES
  (5, 10.00, 'bonus_credit', '5 Referrals Milestone', true),
  (10, 25.00, 'bonus_credit', '10 Referrals Milestone', true),
  (20, 75.00, 'bonus_credit', '20 Referrals Milestone', true),
  (30, 200.00, 'bonus_credit', '30 Referrals Milestone', true);

-- Default Promotions
INSERT INTO promotions (name, description, type, bonus_percentage, minimum_amount, is_active, priority) VALUES
  ('Regular Bonus', 'Standard bonus applied to all loads', 'regular', 10.00, 10.00, true, 0),
  ('First Load Bonus', 'Extra 30% bonus on your first load!', 'first_load', 30.00, 20.00, true, 100);

-- System Settings
INSERT INTO system_settings (key, value, description) VALUES
  ('site_name', 'GameZone', 'Website name'),
  ('site_tagline', 'Top Up. Play More. Win Big.', 'Website tagline'),
  ('default_bonus_percentage', '10', 'Default regular bonus percentage'),
  ('registration_enabled', 'true', 'Allow new user registrations'),
  ('maintenance_mode', 'false', 'Put site in maintenance mode'),
  ('support_email', 'support@yourdomain.com', 'Support email address'),
  ('support_phone', '', 'Support phone number'),
  ('min_order_amount', '10', 'Minimum order amount in USD'),
  ('max_order_amount', '1000', 'Maximum order amount in USD'),
  ('referral_qualification_orders', '1', 'Orders needed to qualify a referral'),
  ('chat_enabled', 'true', 'Enable live chat'),
  ('telegram_enabled', 'false', 'Enable Telegram notifications');
