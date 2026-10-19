-- Migration 037: Add deposit limits to payment_methods and auto-disable trigger

ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS max_deposits INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_deposits INTEGER NOT NULL DEFAULT 0;

-- Function to track deposit counts and auto-disable payment method when max_deposits is reached
CREATE OR REPLACE FUNCTION handle_payment_method_deposit_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_deposits INTEGER;
  v_current_deposits INTEGER;
BEGIN
  -- Only process if payment_method_id is provided and order is a real deposit (not free play)
  IF NEW.payment_method_id IS NOT NULL AND (NEW.is_free_play IS NOT TRUE) AND (NEW.base_amount > 0) THEN
    -- Increment current_deposits
    UPDATE payment_methods
    SET current_deposits = COALESCE(current_deposits, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.payment_method_id
    RETURNING max_deposits, current_deposits INTO v_max_deposits, v_current_deposits;

    -- If a limit is configured and current deposits have reached or exceeded the limit
    IF v_max_deposits IS NOT NULL AND v_max_deposits > 0 AND v_current_deposits >= v_max_deposits THEN
      UPDATE payment_methods
      SET is_active = FALSE,
          updated_at = NOW()
      WHERE id = NEW.payment_method_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on orders INSERT
DROP TRIGGER IF EXISTS trg_payment_method_deposit_limit ON orders;
CREATE TRIGGER trg_payment_method_deposit_limit
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_payment_method_deposit_limit();
