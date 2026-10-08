-- Add music likes count to posts and a per-user music likes table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS music_likes_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS music_post_likes (
  id           SERIAL PRIMARY KEY,
  post_id      INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT music_post_likes_uniq UNIQUE (post_id, user_id)
);
