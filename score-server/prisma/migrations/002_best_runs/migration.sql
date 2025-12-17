-- best run per user per mode (for quick PB + leaderboard features)
CREATE TABLE IF NOT EXISTS best_runs (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  score_numeric double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mode)
);

CREATE INDEX IF NOT EXISTS best_runs_mode_score_idx
  ON best_runs (mode, score_numeric DESC, updated_at ASC);
