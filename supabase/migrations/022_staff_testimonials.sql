-- Update testimonials policy to use is_admin() so staff with permission can manage them
DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
CREATE POLICY "Admins can manage testimonials" ON testimonials FOR ALL USING (is_admin()) WITH CHECK (is_admin());
