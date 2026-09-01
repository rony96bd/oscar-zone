-- Add processed_by to orders and cashout_requests
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES profiles(id);
ALTER TABLE cashout_requests ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES profiles(id);

-- Create an index to make it faster to filter by processed_by
CREATE INDEX IF NOT EXISTS idx_orders_processed_by ON orders(processed_by);
CREATE INDEX IF NOT EXISTS idx_cashouts_processed_by ON cashout_requests(processed_by);
