---
name: Padel Tracker Elo System
description: How the Elo rating system works and its key constraints
---

**Rule:** After any match create/update/delete, `recalculateAllElo()` resets all player Elos to 1500 and replays all matches chronologically. This keeps Elo perfectly consistent even for retroactive edits.

**Why:** A simple "apply delta" approach breaks when historical matches are edited, because it doesn't account for subsequent matches being affected.

**How to apply:** Any time a match mutation route is added, call `recalculateAllElo()` from `artifacts/api-server/src/elo.ts` after the DB write.

**Initial seeding:** tsx/ts-node not available in this environment. Use PL/pgSQL via `psql "$DATABASE_URL"` to run the initial Elo replay. See `artifacts/api-server/migrate-elo.mjs` (plain ESM) and `artifacts/api-server/migrate-elo.ts` as references, but the working seeding was done via psql PL/pgSQL block.

**K factor:** 32 (standard FIDE for active players). Each player's expected score is computed against the opposing TEAM's average Elo.

**Body schema naming:** Use entity-shaped names (PlayerUpdate, MatchUpdate) NOT operation-shaped (UpdatePlayerBody) to avoid TS2308 collisions in codegen.
