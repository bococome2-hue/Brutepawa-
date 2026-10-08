-- Full-text search indexes for BrutePawa Search module
-- Migration: 012_search_indexes

-- ── Users: generated tsvector column ────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(bio, '') || ' ' ||
      coalesce(country, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_users_search_vector ON users USING gin(search_vector);

-- Name-only fast index for ordered results
CREATE INDEX IF NOT EXISTS idx_users_fullname ON users
  USING gin(to_tsvector('french', coalesce(first_name, '') || ' ' || coalesce(last_name, '')));

-- Followers for ranking
CREATE INDEX IF NOT EXISTS idx_users_followers_count ON users(followers_count DESC NULLS LAST);

-- ── Groups: generated tsvector column ───────────────────────────────────────
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(country, '') || ' ' ||
      coalesce(category, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_groups_search_vector ON groups USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_groups_members_count ON groups(members_count DESC NULLS LAST);

-- ── Products: fast text search ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_title_lower ON products (lower(title) text_pattern_ops);

-- ── pg_trgm extension (needed for fast ILIKE on posts) ──────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Posts: trigram index for fast ILIKE search ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON posts USING gin(content gin_trgm_ops);

-- ── Search analytics table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_query_logs (
  id        bigserial PRIMARY KEY,
  user_id   integer NOT NULL,
  query     text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  region    text,
  country   text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_user   ON search_query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_query  ON search_query_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_ts     ON search_query_logs(created_at DESC);

-- ── RLS: search_query_logs only accessible to service role ──────────────────
ALTER TABLE search_query_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'search_query_logs' AND policyname = 'service_only'
  ) THEN
    EXECUTE 'CREATE POLICY service_only ON search_query_logs USING (false)';
  END IF;
END $$;
