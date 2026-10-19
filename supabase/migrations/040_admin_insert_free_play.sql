-- ============================================================
-- 040_admin_insert_free_play.sql
-- Allow admins and staff to manually insert/give free play requests for customers
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert free play requests" ON free_play_requests;
CREATE POLICY "Admins can insert free play requests" ON free_play_requests FOR INSERT WITH CHECK (is_admin());
