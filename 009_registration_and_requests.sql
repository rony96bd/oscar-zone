-- 1. Set default account_status for profiles to pending (for customers only, admins should probably be active or created via backend)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $DO$
DECLARE
  referrer_id UUID := NULL;
  ref_code TEXT := NEW.raw_user_meta_data->>'referral_code_used';
  assigned_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  assigned_status TEXT := 'pending';
BEGIN
  -- If creating an admin/support agent through an internal tool, they could be active
  IF assigned_role IN ('admin', 'super_admin', 'support_agent') THEN
    assigned_status := 'active';
  END IF;

  -- Check if referral code is provided and valid
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    SELECT id INTO referrer_id FROM profiles WHERE lower(referral_code) = lower(ref_code);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, username, telegram, referred_by, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    assigned_role,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'telegram',
    referrer_id,
    assigned_status
  );

  -- If successfully referred, insert into referrals table as pending
  IF referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (referrer_id, NEW.id, 'pending');
  END IF;

  RETURN NEW;
END;
$DO$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create Game ID Requests Table
CREATE TABLE IF NOT EXISTS game_id_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_id_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own game id requests"
  ON game_id_requests FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own game id requests"
  ON game_id_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all game id requests"
  ON game_id_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can update game id requests"
  ON game_id_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );
