-- messaging_settings
CREATE TABLE IF NOT EXISTS messaging_settings (
  user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  online_status              BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled      BOOLEAN NOT NULL DEFAULT true,
  read_receipts_enabled      BOOLEAN NOT NULL DEFAULT true,
  who_can_message            TEXT    NOT NULL DEFAULT 'everyone',
  auto_download_photos       TEXT    NOT NULL DEFAULT 'wifi_only',
  auto_download_videos       TEXT    NOT NULL DEFAULT 'disabled',
  auto_download_audio        TEXT    NOT NULL DEFAULT 'wifi_only',
  auto_download_files        TEXT    NOT NULL DEFAULT 'disabled',
  media_quality              TEXT    NOT NULL DEFAULT 'standard',
  archive_enabled            BOOLEAN NOT NULL DEFAULT true,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- privacy_settings
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id                   BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_visibility         TEXT    NOT NULL DEFAULT 'friends',
  message_permission         TEXT    NOT NULL DEFAULT 'friends',
  friend_list_visibility     TEXT    NOT NULL DEFAULT 'friends_only',
  online_status_visibility   TEXT    NOT NULL DEFAULT 'friends',
  read_receipts              BOOLEAN NOT NULL DEFAULT true,
  search_visibility          TEXT    NOT NULL DEFAULT 'everyone',
  mention_permission         TEXT    NOT NULL DEFAULT 'everyone',
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  messages        BOOLEAN NOT NULL DEFAULT true,
  groups          BOOLEAN NOT NULL DEFAULT true,
  calls           BOOLEAN NOT NULL DEFAULT true,
  mentions        BOOLEAN NOT NULL DEFAULT true,
  reactions       BOOLEAN NOT NULL DEFAULT true,
  friend_requests BOOLEAN NOT NULL DEFAULT true,
  comments        BOOLEAN NOT NULL DEFAULT true,
  likes           BOOLEAN NOT NULL DEFAULT true,
  live_streams    BOOLEAN NOT NULL DEFAULT true,
  marketing       BOOLEAN NOT NULL DEFAULT false,
  invitations     BOOLEAN NOT NULL DEFAULT true,
  archive_notifs  BOOLEAN NOT NULL DEFAULT true,
  pinned_notifs   BOOLEAN NOT NULL DEFAULT true,
  download_notifs BOOLEAN NOT NULL DEFAULT true,
  quality_notifs  BOOLEAN NOT NULL DEFAULT false,
  backup_notifs   BOOLEAN NOT NULL DEFAULT false,
  pins            BOOLEAN NOT NULL DEFAULT true,
  sound           TEXT    NOT NULL DEFAULT 'default',
  vibration       TEXT    NOT NULL DEFAULT 'default',
  show_preview    BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- archived_chats
CREATE TABLE IF NOT EXISTS archived_chats (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id BIGINT NOT NULL,
  archived_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS archived_chats_user_idx ON archived_chats(user_id);

-- pinned_chats
CREATE TABLE IF NOT EXISTS pinned_chats (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id BIGINT NOT NULL,
  position        INT    NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS pinned_chats_user_idx ON pinned_chats(user_id);

-- blocked_users
CREATE TABLE IF NOT EXISTS blocked_users (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);
CREATE INDEX IF NOT EXISTS blocked_users_user_idx ON blocked_users(user_id);

-- message_requests
CREATE TABLE IF NOT EXISTS message_requests (
  id              BIGSERIAL PRIMARY KEY,
  sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_preview TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS message_requests_receiver_idx ON message_requests(receiver_id, status);

-- chat_backups
CREATE TABLE IF NOT EXISTS chat_backups (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  backup_size     BIGINT NOT NULL DEFAULT 0,
  backup_location TEXT,
  auto_backup     BOOLEAN NOT NULL DEFAULT true,
  include_videos  BOOLEAN NOT NULL DEFAULT false,
  include_files   BOOLEAN NOT NULL DEFAULT false,
  last_backup     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS chat_backups_user_idx ON chat_backups(user_id);

-- security_sessions
CREATE TABLE IF NOT EXISTS security_sessions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name     TEXT,
  device_type     TEXT,
  ip_address      TEXT,
  country         TEXT,
  last_activity   TIMESTAMPTZ NOT NULL DEFAULT now(),
  active          BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS security_sessions_user_idx ON security_sessions(user_id, active);

-- security_logs
CREATE TABLE IF NOT EXISTS security_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  ip_address  TEXT,
  device      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_logs_user_idx ON security_logs(user_id);
