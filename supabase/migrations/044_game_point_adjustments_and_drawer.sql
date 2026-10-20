-- ============================================================
-- 044: GAME POINT INVENTORY ADJUSTMENTS & PAYMENT METHOD MONEY DRAWER
-- ============================================================

-- 1. Add notes column to game_point_purchases for tracking reasons (e.g. inventory top-up, deduction)
ALTER TABLE public.game_point_purchases ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create payment_method_adjustments table for Money Drawer (Add Float / Withdraw Float)
CREATE TABLE IF NOT EXISTS public.payment_method_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('add', 'withdraw')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.payment_method_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access on payment_method_adjustments" ON public.payment_method_adjustments;
CREATE POLICY "Admins full access on payment_method_adjustments"
  ON public.payment_method_adjustments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'support_agent')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pm_adjustments_pm_id ON public.payment_method_adjustments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_pm_adjustments_created_at ON public.payment_method_adjustments(created_at DESC);
