-- Banner Storage Bucket public access policy
-- Run this if the banners bucket does not have a public read policy yet.

-- Allow anyone to read from banners bucket (public images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;
