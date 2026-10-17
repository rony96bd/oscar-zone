-- ============================================================
-- 036: CHAT ATTACHMENTS STORAGE BUCKET & POLICIES
-- ============================================================

-- 1. Create the public bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'chat_attachments', 
  'chat_attachments', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing policies to ensure clean creation
DROP POLICY IF EXISTS "Public read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete chat attachments" ON storage.objects;

-- 3. Public Read Access: anyone can view images sent in chat
CREATE POLICY "Public read chat attachments" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat_attachments');

-- 4. Upload Access: both authenticated users and guests can upload chat attachments
CREATE POLICY "Anyone can upload chat attachments" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'chat_attachments');

-- 5. Delete Access: authenticated users and admins can delete attachments
CREATE POLICY "Authenticated users can delete chat attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat_attachments');

-- 6. Ensure attachment_url column exists in chat_messages table
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'attachment_url'
  ) THEN 
    ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT;
  END IF; 
END $$;
