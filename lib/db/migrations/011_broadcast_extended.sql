-- 011_broadcast_extended.sql — Tables étendues pour le module Diffusion BrutePawa

ALTER TABLE broadcast_notifications
  ADD COLUMN IF NOT EXISTS sound_type      TEXT NOT NULL DEFAULT 'brutepawa',
  ADD COLUMN IF NOT EXISTS vibration_type  TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS priority        TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS preview_mode    TEXT NOT NULL DEFAULT 'name_preview',
  ADD COLUMN IF NOT EXISTS silent_mode     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS silent_until    TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS broadcast_statistics (
  id              SERIAL PRIMARY KEY,
  broadcast_id    INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  period          TEXT NOT NULL DEFAULT '30d',
  sent            INTEGER NOT NULL DEFAULT 0,
  delivered       INTEGER NOT NULL DEFAULT 0,
  seen            INTEGER NOT NULL DEFAULT 0,
  open_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bc_stats_bid ON broadcast_statistics(broadcast_id);

CREATE TABLE IF NOT EXISTS broadcast_activity_logs (
  id           SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  user_id      INTEGER,
  action       TEXT NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bc_logs_bid ON broadcast_activity_logs(broadcast_id);

CREATE TABLE IF NOT EXISTS broadcast_security (
  id           SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL UNIQUE REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  pin_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  pin_code     TEXT,
  two_factor   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_ai (
  id           SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  ai_type      TEXT NOT NULL DEFAULT 'summary',
  content      TEXT,
  sentiment    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bc_ai_bid ON broadcast_ai(broadcast_id);

CREATE TABLE IF NOT EXISTS broadcast_advanced_settings (
  id                SERIAL PRIMARY KEY,
  broadcast_id      INTEGER NOT NULL UNIQUE REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  auto_reply        BOOLEAN NOT NULL DEFAULT FALSE,
  auto_reply_msg    TEXT,
  schedule_messages BOOLEAN NOT NULL DEFAULT FALSE,
  auto_archive      BOOLEAN NOT NULL DEFAULT FALSE,
  auto_delete       BOOLEAN NOT NULL DEFAULT FALSE,
  enterprise_mode   BOOLEAN NOT NULL DEFAULT FALSE,
  creator_mode      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_media (
  id           SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL REFERENCES broadcast_lists(id) ON DELETE CASCADE,
  media_type   TEXT NOT NULL,
  url          TEXT NOT NULL,
  size         INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bc_media_bid ON broadcast_media(broadcast_id);
