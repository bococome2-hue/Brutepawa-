CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id"            SERIAL PRIMARY KEY,
  "user_id"       INTEGER NOT NULL UNIQUE,
  "theme"         TEXT NOT NULL DEFAULT 'system',
  "primary_color" TEXT NOT NULL DEFAULT '#22C55E',
  "font_size"     TEXT NOT NULL DEFAULT 'medium',
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
