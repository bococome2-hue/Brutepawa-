-- Add music fields to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_track_name TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_artist      TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_url         TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_artwork_url TEXT;
