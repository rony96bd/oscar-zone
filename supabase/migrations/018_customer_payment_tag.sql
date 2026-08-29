-- Add is_agent to payment_methods
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false;

-- Add customer_payment_tag to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_payment_tag TEXT;
