-- Allow Staff to access and manage necessary tables

-- Cashout Requests
DROP POLICY IF EXISTS "Admins can view cashout requests" ON cashout_requests;
CREATE POLICY "Admins can view cashout requests" ON cashout_requests FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update cashout requests" ON cashout_requests;
CREATE POLICY "Admins can update cashout requests" ON cashout_requests FOR UPDATE USING (is_admin());

-- Free Play Requests
DROP POLICY IF EXISTS "Admins can view free play requests" ON free_play_requests;
CREATE POLICY "Admins can view free play requests" ON free_play_requests FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update free play requests" ON free_play_requests;
CREATE POLICY "Admins can update free play requests" ON free_play_requests FOR UPDATE USING (is_admin());

-- Customers (Profiles)
DROP POLICY IF EXISTS "Admins can view profiles" ON profiles;
CREATE POLICY "Admins can view profiles" ON profiles FOR SELECT USING (is_admin());

-- Orders
DROP POLICY IF EXISTS "Admins can view orders" ON orders;
CREATE POLICY "Admins can view orders" ON orders FOR SELECT USING (is_admin());

-- Testimonials (Winner's Circle)
DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
CREATE POLICY "Admins can manage testimonials" ON testimonials FOR ALL USING (is_admin()) WITH CHECK (is_admin());
