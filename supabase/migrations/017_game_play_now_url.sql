-- Migration 017: Add play_now_url to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS play_now_url TEXT;
