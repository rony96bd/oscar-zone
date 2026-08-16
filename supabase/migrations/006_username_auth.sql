-- ============================================================
-- 006: ADD USERNAME AND TELEGRAM TO PROFILES, REMOVE PHONE/EMAIL RESTRICTIONS
-- ============================================================

-- Add new columns
ALTER TABLE profiles
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN telegram TEXT;

-- Drop NOT NULL constraint on email for orders (guests won't have it)
ALTER TABLE orders
ALTER COLUMN guest_email DROP NOT NULL;

-- Drop guest_phone as well if it's there
ALTER TABLE orders
ALTER COLUMN guest_phone DROP NOT NULL;

-- Update the handle_new_user trigger to save username and telegram
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, username, telegram)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'telegram'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a username is available (used in registration form)
CREATE OR REPLACE FUNCTION check_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_available BOOLEAN;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles WHERE lower(username) = lower(username_to_check)
  ) INTO is_available;
  RETURN is_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
