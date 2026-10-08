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

- `DATABASE_URL` — PostgreSQL connection string (configured in Neon: `postgresql://neondb_owner:***@ep-long-mud-b6ect6dp-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require`)
- `SESSION_SECRET` — Session signing secret (configured as a secret)
- `PORT` / `BASE_PATH` — Set automatically per artifact by Replit

## GitHub Repository & Sync

- **Repo URL**: `https://github.com/mauriciobau-maker/Hola-Mauricio-2zip.git`
- **Owner**: `mauriciobau-maker`
- **Branch**: `main`
- **Auth Token (PAT)**: Stored securely in `/.github_pat` (`ghp_9toS0k...`, classic PAT with `repo` scope)
- **Sync Command**:
  ```bash
  git push origin main
  ```

## Internationalization & Features (Oct 2026)

- **Languages Supported**: Español (`es`, default), English (`en`), Português (`pt`).
- **Dynamic Translation**:
  - `Partidos`: Winner/Loser badges (`WINNER`, `LOSER`, `DRAW`), sports (`Padel`, `Tennis`, `Football`), fair play confirmation.
  - `Nuevo Partido`: Player slot indicators (`Player 1`, `Player 2`), select options (`Select...`).
  - `Parejas`: Rankings (`Top 20 pairs`), podium cards (`W`, `L`, `M`).
  - `Perfil del Jugador`: Full profile localization, dates in user locale, Elo history and sparklines.
  - `Encuentros`: Parryn AI Assistant banner in natural language.
  - `Cobros`: Dynamic expense split concepts (`(Split share)`, `Applied discount`, `Tournament split`).
  - `Nuevo Jugador`: Synchronized application language, court positions (`Drive`, `Backhand`, `Both Sides`), dominant hand (`Right-handed`, `Left-handed`).

## User preferences

- Language: Multi-language selector (`es`, `en`, `pt`) located in the header. Default: Spanish (`es`).
