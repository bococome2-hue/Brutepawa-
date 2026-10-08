-- Full-text search migration
-- Enables unaccent extension and populates tsvector columns via triggers
-- for French-language, accent-insensitive full-text search.

-- 1. Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- -----------------------------------------------------------------------
-- POSTS
-- -----------------------------------------------------------------------

-- 2. Add search_vector column to posts (populated by trigger)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 3. Trigger function: keep search_vector in sync with content
CREATE OR REPLACE FUNCTION posts_search_vector_update()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('french', unaccent(coalesce(NEW.content, '')));
  RETURN NEW;
END;
$$;

-- 4. Attach trigger (drop first so re-runs are idempotent)
DROP TRIGGER IF EXISTS posts_search_vector_trigger ON posts;
CREATE TRIGGER posts_search_vector_trigger
  BEFORE INSERT OR UPDATE OF content ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

-- 5. Backfill existing rows
UPDATE posts
  SET search_vector = to_tsvector('french', unaccent(coalesce(content, '')));

-- 6. GIN index for fast FTS on posts
CREATE INDEX IF NOT EXISTS posts_search_vector_idx
  ON posts USING GIN (search_vector);

-- -----------------------------------------------------------------------
-- GROUPS
-- -----------------------------------------------------------------------

-- 7. Add search_vector column to groups (populated by trigger)
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 8. Trigger function: keep search_vector in sync with name/description/category
CREATE OR REPLACE FUNCTION groups_search_vector_update()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('french',
      unaccent(
        coalesce(NEW.name, '') || ' ' ||
        coalesce(NEW.description, '') || ' ' ||
        coalesce(NEW.category, '')
      )
    );
  RETURN NEW;
END;
$$;

-- 9. Attach trigger (drop first so re-runs are idempotent)
DROP TRIGGER IF EXISTS groups_search_vector_trigger ON groups;
CREATE TRIGGER groups_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, description, category ON groups
  FOR EACH ROW EXECUTE FUNCTION groups_search_vector_update();

-- 10. Backfill existing rows
UPDATE groups
  SET search_vector = to_tsvector('french',
    unaccent(
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '')
    )
  );

-- 11. GIN index for fast FTS on groups
CREATE INDEX IF NOT EXISTS groups_search_vector_idx
  ON groups USING GIN (search_vector);
