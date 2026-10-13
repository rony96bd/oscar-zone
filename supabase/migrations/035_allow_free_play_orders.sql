-- ============================================================
-- 035: ALLOW FREE PLAY ORDERS & OPTIONAL PAYMENT METHOD
-- ============================================================

-- 1. Allow payment_method_id to be NULL for Free Play & admin manual orders
ALTER TABLE public.orders ALTER COLUMN payment_method_id DROP NOT NULL;

-- 2. Allow base_amount to be 0 for Free Play orders (previously base_amount > 0)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_base_amount_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_base_amount_check CHECK (base_amount >= 0);

-- 3. Add is_free_play flag column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_free_play BOOLEAN NOT NULL DEFAULT false;

-- 4. Index for fast querying of free play orders
CREATE INDEX IF NOT EXISTS idx_orders_is_free_play ON public.orders(is_free_play);
