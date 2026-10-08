-- Extend products table with marketplace-specific fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS views_count   INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition     TEXT    DEFAULT 'Neuf';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_verified   BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_pct  INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS city          TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS country_code  TEXT;

-- Marketplace services table
CREATE TABLE IF NOT EXISTS marketplace_services (
  id            SERIAL       PRIMARY KEY,
  user_id       INTEGER      NOT NULL DEFAULT 1,
  name          TEXT         NOT NULL,
  profession    TEXT         NOT NULL,
  description   TEXT,
  price         NUMERIC(15,2),
  currency      TEXT         NOT NULL DEFAULT 'XOF',
  country       TEXT,
  city          TEXT,
  rating        NUMERIC(3,1) DEFAULT 5.0,
  reviews_count INTEGER      DEFAULT 0,
  avatar_url    TEXT,
  cover_color   TEXT         DEFAULT '#22C55E',
  is_verified   BOOLEAN      DEFAULT true,
  status        TEXT         NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Marketplace favorites table
CREATE TABLE IF NOT EXISTS marketplace_favorites (
  id         SERIAL      PRIMARY KEY,
  user_id    INTEGER     NOT NULL,
  item_type  TEXT        NOT NULL,
  item_id    INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- Seed demo services
INSERT INTO marketplace_services (user_id, name, profession, rating, reviews_count, avatar_url, cover_color, is_verified, city, country)
VALUES
  (1, 'Martin D.',   'Plombier',        4.8, 124, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80', '#22C55E', true, 'Abidjan', 'CI'),
  (1, 'Aminata C.',  'Femme de ménage', 4.9,  98, 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80', '#F97316', true, 'Dakar',   'SN'),
  (1, 'Yacine B.',   'Électricien',     4.7,  76, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', '#6366F1', true, 'Abidjan', 'CI'),
  (1, 'Sophie K.',   'Coiffeuse',       4.7, 112, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80', '#EC4899', true, 'Lomé',    'TG');

-- Seed demo products (if table is empty or has < 4 rows)
INSERT INTO products (title, description, price, currency, category, image_url, status, seller_id, location, views_count, is_verified, discount_pct, condition, city, country_code)
SELECT * FROM (VALUES
  ('Basket Nike Air Force 1', 'Chaussures Nike neuves pointure 42', 35000, 'XOF', 'Mode',        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', 'active', 1, 'Abidjan, Cocody',   1200, true, 15,   'Neuf',     'Abidjan', 'CI'),
  ('Sac à main Luxe',         'Sac Gucci authentique, très bon état', 25000, 'XOF', 'Mode',        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80', 'active', 1, 'Dakar, Almadies',    890, true, NULL, 'Occasion', 'Dakar',   'SN'),
  ('iPhone 14 Pro Max',       '256 Go, couleur space black, débloqué', 750000, 'XOF', 'Électronique','https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=600&q=80', 'active', 1, 'Paris, France',    2300, true, NULL, 'Neuf',     'Paris',   'FR'),
  ('Canapé 3 places',         'Canapé velours vert, comme neuf', 120000, 'XOF', 'Maison',       'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80', 'active', 1, 'Abidjan, Marcory',   564, true, NULL, 'Occasion', 'Abidjan', 'CI')
) AS v(title, description, price, currency, category, image_url, status, seller_id, location, views_count, is_verified, discount_pct, condition, city, country_code)
WHERE (SELECT COUNT(*) FROM products) < 4;
