-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  display_name text,
  is_guest boolean NOT NULL DEFAULT false
);

-- linked identities (google/facebook)
CREATE TABLE IF NOT EXISTS auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google','facebook')),
  provider_user_id text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider, provider_user_id)
);

-- immutable runs
CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,                 -- e.g. "easy|9x9|10"
  seconds_taken integer NOT NULL CHECK (seconds_taken > 0),
  bombs_marked integer NOT NULL CHECK (bombs_marked >= 0),
  total_cells integer NOT NULL CHECK (total_cells > 0),
  score_numeric double precision NOT NULL,  -- computed server-side
  client_platform text NOT NULL,       -- web/desktop/mobile/facebook/etc
  client_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
