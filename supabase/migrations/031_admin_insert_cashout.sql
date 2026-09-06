-- Allow admins and staff to manually insert cashout requests for customers
DROP POLICY IF EXISTS "Admins can insert cashout requests" ON cashout_requests;
CREATE POLICY "Admins can insert cashout requests" ON cashout_requests FOR INSERT WITH CHECK (is_admin());
