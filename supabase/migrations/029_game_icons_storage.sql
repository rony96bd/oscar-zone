-- Create a public bucket for game icons
INSERT INTO storage.buckets (id, name, public) VALUES ('game-icons', 'game-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to game icons
CREATE POLICY "Public read game icons" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'game-icons');

-- Allow admin/support_agent to upload game icons
CREATE POLICY "Admin can upload game icons" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'game-icons' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'support_agent')
  );

-- Allow admin/support_agent to update/delete game icons
CREATE POLICY "Admin can update game icons" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'game-icons' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'support_agent')
  );

CREATE POLICY "Admin can delete game icons" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'game-icons' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'support_agent')
  );
