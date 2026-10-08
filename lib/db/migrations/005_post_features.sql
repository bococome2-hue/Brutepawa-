ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_disabled boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'public';

CREATE TABLE IF NOT EXISTS hidden_posts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  post_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hidden_posts_pair_idx ON hidden_posts(user_id, post_id);
CREATE INDEX IF NOT EXISTS hidden_posts_user_idx ON hidden_posts(user_id);
CREATE INDEX IF NOT EXISTS hidden_posts_post_idx ON hidden_posts(post_id);
