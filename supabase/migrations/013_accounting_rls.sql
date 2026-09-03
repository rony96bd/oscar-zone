-- Create accounting_cycles table
CREATE TABLE IF NOT EXISTS accounting_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  total_deposits numeric NOT NULL DEFAULT 0,
  total_cashouts numeric NOT NULL DEFAULT 0,
  total_agent_commissions numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Insert initial active cycle if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounting_cycles WHERE status = 'active') THEN
    INSERT INTO accounting_cycles (start_date, status)
    VALUES (
      (SELECT COALESCE(MIN(created_at), now()) FROM orders),
      'active'
    );
  END IF;
END $$;

-- Add agent_commission_rate to payment_methods if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_methods' AND column_name = 'agent_commission_rate'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN agent_commission_rate numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add RLS policies for accounting tables
ALTER TABLE accounting_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access accounting_cycles" ON accounting_cycles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS game_point_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id),
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE game_point_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access game_point_purchases" ON game_point_purchases FOR ALL USING (is_admin()) WITH CHECK (is_admin());


