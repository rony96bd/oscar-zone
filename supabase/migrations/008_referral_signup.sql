CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID := NULL;
  ref_code TEXT := NEW.raw_user_meta_data->>'referral_code_used';
BEGIN
  -- Check if referral code is provided and valid
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    SELECT id INTO referrer_id FROM profiles WHERE lower(referral_code) = lower(ref_code);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, username, telegram, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'telegram',
    referrer_id
  );

  -- If successfully referred, insert into referrals table as pending
  IF referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (referrer_id, NEW.id, 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
