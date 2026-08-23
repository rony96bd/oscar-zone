ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_status_check CHECK (account_status IN ('active', 'suspended', 'restricted', 'pending'));
