-- ============================================================
-- STORAGE BUCKET POLICIES
-- ============================================================

-- Note: Run these after creating buckets in Supabase Dashboard
-- Or use Supabase CLI / API to create buckets:
-- payment-screenshots (private)
-- avatars (public)
-- game-assets (public)
-- banners (public)
-- payment-method-assets (public)
-- chat-attachments (private)

-- Payment Screenshots: customers own files, admins can view all
CREATE POLICY "Customers can upload their screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-screenshots' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'guest')
  );

CREATE POLICY "Customers can view their own screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-screenshots' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','support_agent'))
    )
  );

CREATE POLICY "Admins can view all screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-screenshots' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','support_agent'))
  );

-- Avatars: users own their files
CREATE POLICY "Users can upload their avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Game assets: admins only
CREATE POLICY "Anyone can view game assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-assets');

CREATE POLICY "Admins can manage game assets"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'game-assets' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  )
  WITH CHECK (
    bucket_id = 'game-assets' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- Banners: public read, admin write
CREATE POLICY "Anyone can view banners"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('banners', 'payment-method-assets'));

CREATE POLICY "Admins can manage banners"
  ON storage.objects FOR ALL
  USING (
    bucket_id IN ('banners','payment-method-assets') AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  )
  WITH CHECK (
    bucket_id IN ('banners','payment-method-assets') AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
