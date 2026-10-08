-- Add missing columns to notifications table for full maquette support
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_avatar_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;
