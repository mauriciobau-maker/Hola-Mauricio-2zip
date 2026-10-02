BEGIN;

CREATE TABLE IF NOT EXISTS sport_modalities (
  id SERIAL PRIMARY KEY,
  sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  team_size INTEGER NOT NULL,
  min_team_size INTEGER,
  max_team_size INTEGER,
  use_sets BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sport_modalities_sport_id_slug_unique UNIQUE (sport_id, slug)
);

CREATE INDEX IF NOT EXISTS sport_modalities_sport_id_idx
  ON sport_modalities (sport_id);

CREATE TABLE IF NOT EXISTS player_sport_ratings (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  elo INTEGER NOT NULL DEFAULT 1500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_sport_ratings_player_id_sport_id_unique UNIQUE (player_id, sport_id)
);

CREATE INDEX IF NOT EXISTS player_sport_ratings_player_id_idx
  ON player_sport_ratings (player_id);

CREATE INDEX IF NOT EXISTS player_sport_ratings_sport_id_idx
  ON player_sport_ratings (sport_id);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS modality_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_modality_id_fk'
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT matches_modality_id_fk
      FOREIGN KEY (modality_id) REFERENCES sport_modalities(id) ON DELETE RESTRICT;
  END IF;
END $$;

INSERT INTO sport_modalities (sport_id, name, slug, team_size, min_team_size, max_team_size, use_sets)
SELECT s.id, v.name, v.slug, v.team_size, v.min_team_size, v.max_team_size, v.use_sets
FROM sports s
JOIN (
  VALUES
    ('padel', 'Individual', 'individual', 1, 1, 1, TRUE),
    ('padel', 'Dobles', 'dobles', 2, 2, 2, TRUE),
    ('tenis', 'Individual', 'individual', 1, 1, 1, TRUE),
    ('tenis', 'Dobles', 'dobles', 2, 2, 2, TRUE),
    ('futbol', 'Fútbol 5', 'futbol-5', 5, 5, 5, FALSE),
    ('futbol', 'Fútbol 7', 'futbol-7', 7, 7, 7, FALSE),
    ('futbol', 'Fútbol 8', 'futbol-8', 8, 8, 8, FALSE),
    ('futbol', 'Fútbol 11', 'futbol-11', 11, 11, 11, FALSE)
) AS v(sport_slug, name, slug, team_size, min_team_size, max_team_size, use_sets)
  ON v.sport_slug = s.slug
ON CONFLICT (sport_id, slug) DO NOTHING;

INSERT INTO player_sport_ratings (player_id, sport_id, elo)
SELECT p.id, s.id, 1500
FROM players p
CROSS JOIN sports s
ON CONFLICT (player_id, sport_id) DO NOTHING;

DELETE FROM elo_history;
DELETE FROM match_players;
DELETE FROM matches;
ALTER TABLE matches ALTER COLUMN modality_id SET NOT NULL;

COMMIT;