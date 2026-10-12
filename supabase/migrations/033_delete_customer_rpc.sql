-- ============================================================
-- 033: COMPLETE USER DELETION RPC & FOREIGN KEY CASCADE FIXES
-- ============================================================

-- 1. Fix foreign key constraints so cascades don't fail
DO $$
BEGIN
  -- profiles.referred_by -> ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_referred_by_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_referred_by_fkey;
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_referred_by_fkey 
      FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- testimonials.user_id -> ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'testimonials_user_id_fkey' AND table_name = 'testimonials'
  ) THEN
    ALTER TABLE public.testimonials DROP CONSTRAINT testimonials_user_id_fkey;
    ALTER TABLE public.testimonials 
      ADD CONSTRAINT testimonials_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- referral_earnings.referral_id -> ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_earnings_referral_id_fkey' AND table_name = 'referral_earnings'
  ) THEN
    ALTER TABLE public.referral_earnings DROP CONSTRAINT referral_earnings_referral_id_fkey;
    ALTER TABLE public.referral_earnings 
      ADD CONSTRAINT referral_earnings_referral_id_fkey 
      FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Atomic Database Function to delete customer and all related data
CREATE OR REPLACE FUNCTION public.delete_customer_completely(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_has_perm BOOLEAN := false;
BEGIN
  -- Verify caller is admin, super_admin, or has manage_customers permission
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    SELECT has_access INTO v_has_perm FROM public.staff_permissions 
    WHERE staff_id = auth.uid() AND permission_key = 'manage_customers';

    IF NOT COALESCE(v_has_perm, false) THEN
      RAISE EXCEPTION 'Forbidden: Admins only';
    END IF;
  END IF;

  -- 1. Unlink profiles referred_by
  UPDATE public.profiles SET referred_by = NULL WHERE referred_by = target_user_id;

  -- 2. Referral earnings associated with user or user referrals or user orders
  DELETE FROM public.referral_earnings
  WHERE user_id = target_user_id
     OR referral_id IN (SELECT id FROM public.referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id)
     OR source_order_id IN (SELECT id FROM public.orders WHERE user_id = target_user_id);

  -- 3. Referrals
  DELETE FROM public.referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;

  -- 4. Fraud flags
  DELETE FROM public.fraud_flags 
  WHERE user_id = target_user_id 
     OR order_id IN (SELECT id FROM public.orders WHERE user_id = target_user_id);

  -- 5. Testimonials
  DELETE FROM public.testimonials WHERE user_id = target_user_id;

  -- 6. Free play requests
  DELETE FROM public.free_play_requests WHERE user_id = target_user_id;

  -- 7. Cashout requests
  DELETE FROM public.cashout_requests WHERE user_id = target_user_id;

  -- 8. Orders (cascades to order_status_history, order_bonus_snapshots)
  DELETE FROM public.orders WHERE user_id = target_user_id;

  -- 9. Custom bonuses
  DELETE FROM public.custom_bonuses WHERE customer_id = target_user_id;

  -- 10. Customer games
  DELETE FROM public.customer_games WHERE customer_id = target_user_id;

  -- 11. Customer notes
  DELETE FROM public.customer_notes WHERE customer_id = target_user_id OR admin_id = target_user_id;

  -- 12. Chat messages and conversations
  DELETE FROM public.chat_messages 
  WHERE sender_id = target_user_id 
     OR conversation_id IN (SELECT id FROM public.chat_conversations WHERE customer_id = target_user_id);
  DELETE FROM public.chat_conversations WHERE customer_id = target_user_id;

  -- 13. Notifications
  DELETE FROM public.notifications WHERE user_id = target_user_id;

  -- 14. Push subscriptions
  DELETE FROM public.push_subscriptions WHERE user_id = target_user_id;

  -- 15. Unlink processed_by / assigned_agent_id references
  UPDATE public.orders SET processed_by = NULL WHERE processed_by = target_user_id;
  UPDATE public.orders SET assigned_agent_id = NULL WHERE assigned_agent_id = target_user_id;
  UPDATE public.cashout_requests SET processed_by = NULL WHERE processed_by = target_user_id;
  UPDATE public.chat_conversations SET assigned_agent_id = NULL WHERE assigned_agent_id = target_user_id;

  -- 16. Delete from profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 17. Delete from auth.users (if still present)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Customer deleted successfully');
END;
$$;

-- Grant execution to authenticated users (function checks admin role internally)
GRANT EXECUTE ON FUNCTION public.delete_customer_completely(UUID) TO authenticated;
