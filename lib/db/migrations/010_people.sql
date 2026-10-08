-- 010_people.sql: People / Friends / Followers / Score / Countries / Suggestions / Referrals

-- ── Extend users table ─────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verified         BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS score            INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_count  INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count  INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS friends_count    INTEGER     NOT NULL DEFAULT 0;

-- ── Friendships (accepted, bidirectional) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  friend_id  INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS friendships_user_idx   ON friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_idx ON friendships(friend_id);

-- ── User scores (history) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_scores (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL UNIQUE,
  score             INTEGER NOT NULL DEFAULT 0,
  friends_points    INTEGER NOT NULL DEFAULT 0,
  followers_points  INTEGER NOT NULL DEFAULT 0,
  posts_points      INTEGER NOT NULL DEFAULT 0,
  engagement_points INTEGER NOT NULL DEFAULT 0,
  computed_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_scores_user_idx ON user_scores(user_id);

-- ── Countries ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  code     VARCHAR(5)   NOT NULL UNIQUE,
  flag_url TEXT
);

INSERT INTO countries (name, code) VALUES
  ('Bénin',         'BJ'),
  ('Togo',          'TG'),
  ('Sénégal',       'SN'),
  ('Côte d''Ivoire','CI'),
  ('Burkina Faso',  'BF'),
  ('Niger',         'NE'),
  ('Mali',          'ML'),
  ('Cameroun',      'CM'),
  ('Ghana',         'GH'),
  ('Nigeria',       'NG')
ON CONFLICT (code) DO NOTHING;

-- ── Suggestions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suggestions (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL,
  suggested_user_id INTEGER NOT NULL,
  score             INTEGER NOT NULL DEFAULT 0,
  reason            TEXT,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, suggested_user_id)
);
CREATE INDEX IF NOT EXISTS suggestions_user_idx ON suggestions(user_id);

-- ── Referrals ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id         SERIAL PRIMARY KEY,
  inviter_id INTEGER NOT NULL,
  invited_id INTEGER,
  invite_key TEXT    NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  method     TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS referrals_inviter_idx ON referrals(inviter_id);
