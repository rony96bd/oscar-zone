-- 041_nav_menu_settings.sql
-- Default configuration for toggleable navigation menus (Homepage & Customer Login)

INSERT INTO system_settings (key, value, description)
VALUES 
  (
    'public_nav_menus', 
    '{"home":true,"games":true,"promotions":true,"payment-tags":true,"contact":true,"transaction-board":true,"winners-circle":true,"how-it-works":true,"referral":true}', 
    'Visibility of homepage/public navigation menu items'
  ),
  (
    'customer_nav_menus', 
    '{"dashboard":true,"my-games":true,"games":true,"load":true,"cashout":true,"orders":true,"earnings":true,"free-play":true,"notifications":true,"chat":true,"profile":true}', 
    'Visibility of customer logged-in navigation menu items'
  )
ON CONFLICT (key) DO NOTHING;
