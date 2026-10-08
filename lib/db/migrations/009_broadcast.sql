-- ── broadcast_lists ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_lists (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#22C55E',
  emoji       TEXT NOT NULL DEFAULT '📢',
  cover_image TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_owner ON broadcast_lists(owner_id);

-- ── broadcast_members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_members (
  id           SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (broadcast_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_members_bid  ON broadcast_members(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_members_uid  ON broadcast_members(user_id);

-- ── broadcast_messages ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id           SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  sender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text',
  content      TEXT NOT NULL DEFAULT '',
  media_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_bid ON broadcast_messages(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_ts  ON broadcast_messages(created_at DESC);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_fts ON broadcast_messages USING gin(to_tsvector('simple', content));

-- ── broadcast_message_receipts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_message_receipts (
  id           SERIAL PRIMARY KEY,
  message_id   INTEGER NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered    BOOLEAN NOT NULL DEFAULT FALSE,
  seen         BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  seen_at      TIMESTAMPTZ,
  UNIQUE (message_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_bc_receipts_mid ON broadcast_message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_bc_receipts_rid ON broadcast_message_receipts(recipient_id);

-- ── broadcast_notifications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_notifications (
  id                    SERIAL PRIMARY KEY,
  broadcast_id          INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sound_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  vibration_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  high_priority         BOOLEAN NOT NULL DEFAULT TRUE,
  mute_until            TIMESTAMPTZ,
  UNIQUE (broadcast_id, user_id)
);

-- ── broadcast_exports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_exports (
  id           SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  export_type  TEXT NOT NULL,
  file_url     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed demo list for all existing users ────────────────────────────────────
-- (no seed data — will be created on first use)
