-- ── Location module — Migration 013 ──────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Main locations table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id           bigserial    PRIMARY KEY,
  name         text         NOT NULL,
  city         text,
  region       text,
  country      text         NOT NULL DEFAULT 'Bénin',
  country_code text         NOT NULL DEFAULT 'BJ',
  lat          double precision,
  lng          double precision,
  place_type   text         NOT NULL DEFAULT 'city',
  usage_count  integer      NOT NULL DEFAULT 0,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_name_trgm  ON locations USING gin(lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_country     ON locations (country_code);
CREATE INDEX IF NOT EXISTS idx_locations_usage       ON locations (usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_locations_name_lower  ON locations (lower(name) text_pattern_ops);

-- ── User recent locations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_recent_locations (
  id          bigserial    PRIMARY KEY,
  user_id     integer      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id bigint       NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  used_at     timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_user_recent_loc ON user_recent_locations(user_id, used_at DESC);

-- ── User saved locations (favorites) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_saved_locations (
  id          bigserial    PRIMARY KEY,
  user_id     integer      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id bigint       NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  label       text,
  icon        text         DEFAULT '📍',
  created_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_user_saved_loc ON user_saved_locations(user_id);

-- ── Post locations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_locations (
  post_id       integer      PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  location_id   bigint       NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  location_text text,
  privacy       text         NOT NULL DEFAULT 'public',
  created_at    timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_locations_loc ON post_locations(location_id);

-- ── Seed: West Africa popular cities ────────────────────────────────────────
INSERT INTO locations (name, city, region, country, country_code, lat, lng, place_type, usage_count) VALUES
('Cotonou',                  NULL,       'Littoral',              'Bénin',         'BJ', 6.3703,  2.3912,  'city',         5000),
('Porto-Novo',               NULL,       'Ouémé',                 'Bénin',         'BJ', 6.4969,  2.6289,  'city',         3000),
('Parakou',                  NULL,       'Borgou',                'Bénin',         'BJ', 9.3370,  2.6282,  'city',         2000),
('Abomey',                   NULL,       'Zou',                   'Bénin',         'BJ', 7.1851,  1.9915,  'city',         1500),
('Allada',                   NULL,       'Atlantique',            'Bénin',         'BJ', 6.6710,  2.1499,  'city',         1000),
('Lokossa',                  NULL,       'Mono',                  'Bénin',         'BJ', 6.6408,  1.7174,  'city',          800),
('Natitingou',               NULL,       'Atacora',               'Bénin',         'BJ',10.3056,  1.3769,  'city',          700),
('Kandi',                    NULL,       'Alibori',               'Bénin',         'BJ',11.1267,  2.9361,  'city',          600),
('Bohicon',                  NULL,       'Zou',                   'Bénin',         'BJ', 7.1834,  2.0679,  'city',          500),
('Ouidah',                   NULL,       'Atlantique',            'Bénin',         'BJ', 6.3612,  2.0849,  'city',          450),
('Fidjrossé',                'Cotonou',  'Littoral',              'Bénin',         'BJ', 6.3500,  2.3700,  'neighborhood',  300),
('Akpapa',                   'Cotonou',  'Littoral',              'Bénin',         'BJ', 6.3800,  2.4000,  'neighborhood',  200),
('Aéroport de Cotonou',      'Cotonou',  'Littoral',              'Bénin',         'BJ', 6.3523,  2.3846,  'airport',       150),
('Parakou Centre',           'Parakou',  'Borgou',                'Bénin',         'BJ', 9.3500,  2.6300,  'neighborhood',  180),
('Aéroport de Parakou',      'Parakou',  'Borgou',                'Bénin',         'BJ', 9.3579,  2.6097,  'airport',       120),
('Parakou Gare',             'Parakou',  'Borgou',                'Bénin',         'BJ', 9.3300,  2.6250,  'poi',           100),
('Université d''Abomey-Calavi','Cotonou','Atlantique',            'Bénin',         'BJ', 6.4074,  2.3411,  'poi',           250),
('Abidjan',                  NULL,       'Lagunes',               'Côte d''Ivoire','CI', 5.3600, -4.0083,  'city',         1200),
('Dakar',                    NULL,       'Dakar',                 'Sénégal',       'SN',14.7167,-17.4677,  'city',         1000),
('Bamako',                   NULL,       'District de Bamako',    'Mali',          'ML',12.6392, -8.0029,  'city',          900),
('Lomé',                     NULL,       'Maritime',              'Togo',          'TG', 6.1375,  1.2123,  'city',          800),
('Niamey',                   NULL,       'Niamey',                'Niger',         'NE',13.5137,  2.1098,  'city',          700),
('Ouagadougou',              NULL,       'Kadiogo',               'Burkina Faso',  'BF',12.3569, -1.5353,  'city',          600),
('Accra',                    NULL,       'Greater Accra',         'Ghana',         'GH', 5.5600, -0.2057,  'city',          500),
('Lagos',                    NULL,       'Lagos',                 'Nigeria',       'NG', 6.5244,  3.3792,  'city',          450),
('Douala',                   NULL,       'Littoral',              'Cameroun',      'CM', 4.0511,  9.7679,  'city',          400),
('Conakry',                  NULL,       'Conakry',               'Guinée',        'GN', 9.5370,-13.6773,  'city',          350),
('Casablanca',               NULL,       'Casablanca-Settat',     'Maroc',         'MA',33.5731, -7.5898,  'city',          300),
('Paris',                    NULL,       'Île-de-France',         'France',        'FR',48.8566,  2.3522,  'city',          200),
('Montréal',                 NULL,       'Québec',                'Canada',        'CA',45.5017,-73.5673,  'city',          150)
ON CONFLICT DO NOTHING;
