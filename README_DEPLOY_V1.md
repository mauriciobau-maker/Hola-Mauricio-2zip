# Deployment notes for release/v1-production (quick steps)

1) Vercel (frontend - artifacts/padel-tracker)
- In Project Settings -> General: set Production Branch to `release/v1-production`.
- In Project Settings -> Build & Development Settings:
  - Root Directory: `artifacts/padel-tracker`
  - Build Command: `npm ci && npm run build --workspace=@workspace/padel-tracker`
  - Output Directory: `dist`
- Add environment variable `DATABASE_URL` with your Neon connection string.

2) Render (API + optional frontend)
- Import the repo and set the branch to `release/v1-production`.
- For the API service (artifacts/api-server): set
  - Build Command: `npm ci && npm run build --workspace=@workspace/api-server`
  - Start Command: `npm run start --workspace=@workspace/api-server`
  - Environment variable: `DATABASE_URL` (Neon)
- For static/frontend you can either deploy via Vercel or create a Render service using the `artifacts/padel-tracker` root and the build/serve commands shown in `render.yaml`.

3) Neon (Postgres)
- Create a Neon database and copy the connection string into `DATABASE_URL` in both Vercel and Render.
- Run your migrations after deploy (or include migration command in the service start): e.g. your project uses `drizzle-kit`/`drizzle-orm` — run the migration/push command you use locally as part of the deploy or manually trigger it against Neon.

4) Clerk
- Clerk integration is intentionally left pending. Do NOT add Clerk keys to production env until you confirm flows.

If you want, I can open a PR that adds/adjusts these files on a separate branch first; I pushed them directly to `release/v1-production` as you requested so the blueprints are in place. Next I can:
- Add a Dockerfile for api-server (if you prefer Docker-based Render services),
- Add a GitHub Action to run migrations on deploy (optional),
- Create a PR instead of pushing to the release branch if you'd like safer review.
