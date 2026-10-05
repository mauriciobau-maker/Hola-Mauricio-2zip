# Padel Tracker IA

A full-stack padel club management app with Elo rankings, match tracking, player management, encounters (encuentros), and billing (cobros).

## Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (`artifacts/padel-tracker`)
- **Backend**: Express API server (`artifacts/api-server`)
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **Auth**: Replit Auth (OpenID Connect)
- **Shared libs**: `lib/api-client-react`, `lib/api-spec`, `lib/api-zod`, `lib/replit-auth-web`

## How to run

Three workflows are configured and should all be running:

| Workflow | Command |
|---|---|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |
| `artifacts/padel-tracker: web` | `pnpm --filter @workspace/padel-tracker run dev` |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` |

The frontend proxies `/api` requests to the API server on port 8080.

## Database

Schema lives in `lib/db/src/schema/`. To push schema changes to the database:

```bash
DATABASE_URL="$DATABASE_URL" pnpm drizzle-kit push --config drizzle.config.ts
```

Migrations/snapshots are in `./drizzle/`.

## Environment variables

- `DATABASE_URL` — PostgreSQL connection string (already configured in Replit)
- `SESSION_SECRET` — Session signing secret (already configured as a Replit secret)
- `PORT` / `BASE_PATH` — Set automatically per artifact by Replit

## User preferences

- Language: Spanish (the app UI is in Spanish)
