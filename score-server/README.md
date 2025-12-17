# Score Server (Fastify + Postgres)

Fastify API for Minesweeper scores, built to run on Heroku with a Postgres add-on.

## Endpoints

- `GET /health` – uptime check
- `GET /api/scores?limit=50` – list fastest scores (ascending by `timeMs`, then `createdAt`)
- `POST /api/scores` – create a score  
  Body: `{ "playerName": "Alice", "difficulty": "hard", "timeMs": 12345 }`
- `POST /api/runs` – submit an immutable run (JWT required); add `?leaderboardLimit=10` to include a leaderboard slice
- `GET /leaderboards/:mode` – read the top leaderboard for a mode (defaults to 15; optional `?limit=15`)
- `POST /auth/google/login` – verify Google token, return JWT
- `POST /auth/facebook/login` – verify Facebook token, return JWT
- `POST /auth/google/link` – link Google identity to existing user (JWT required)
- `POST /auth/facebook/link` – link Facebook identity to existing user (JWT required)

## Environment

Copy `.env.example` to `.env` locally:

```
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgres://user:password@hostname:5432/minesweeper
DATABASE_SSL=true
DB_POOL_MAX=10
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

Heroku sets `PORT` and `DATABASE_URL`. Leave `DATABASE_SSL=true` so the pool negotiates TLS (`rejectUnauthorized: false`).
Set `JWT_SECRET`, `GOOGLE_CLIENT_ID`, and `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` as Heroku config vars.

## Database shape

```sql
CREATE TABLE scores (
  id serial PRIMARY KEY,
  player_name text NOT NULL,
  difficulty text NOT NULL,
  time_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scores_time_idx ON scores (time_ms ASC, created_at ASC);
```

## Run locally

```bash
npm install         # from the repository root to install workspace deps
cd score-server
npm install         # install API deps
npm run dev         # nodemon watch mode
```

## Deploy on Heroku

1. Add the Heroku Postgres add-on (provisions `DATABASE_URL`).
2. Push the repo; Heroku will run `web: npm start --prefix score-server` from the `Procfile`.
3. Set `NODE_ENV=production` and keep `DATABASE_SSL=true` if required by your Postgres plan.
