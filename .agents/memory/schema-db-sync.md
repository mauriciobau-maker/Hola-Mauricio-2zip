---
name: DB schema sync history
description: How the Drizzle schema and the actual Postgres DB relate — past drift, how it was resolved, and what to watch for.
---

## What happened
The Drizzle schema was significantly expanded (clubs, sports, match_players, gastos, cobros, etc.) but migrations were never run. The DB already had most new tables/columns applied manually at some earlier point. The `information_schema.columns WHERE table_schema = 'public'` query was misleading — it showed fewer columns than actually existed. Always use `WHERE table_name = 'X'` WITHOUT schema filter to see all real columns.

## How it was resolved
1. Added missing columns to Drizzle schema: clubs (country/state/city/map_url/default_language), auth/users (name/nickname/phone), matches (status).
2. Applied missing columns directly via SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
3. Applied unique constraint on users.email manually before running drizzle push.
4. Deleted orphaned test data in asistencia (player_ids 3/4/5 referencing non-existent players).
5. Ran `pnpm --filter @workspace/db run push` successfully.

**Why:** drizzle-kit push requires interactive TTY — it will ask about truncation when adding unique constraints to tables with data. Apply constraints manually via SQL first when running non-interactively.

**How to apply:** Before any future `drizzle push`, check for orphaned FK records and unique constraint conflicts. Use raw SQL for structural changes when push fails with TTY error.

## RBAC bug fixed
Club admins were being created with `isAdmin: 1` (super-admin flag) instead of `isClubAdmin: 1`. Fixed in admin.ts — new club admins now get `isAdmin: 0, isClubAdmin: 1`. checkRole middleware already handled both flags correctly.

## Cobros route import
Was importing from `@workspace/db/schema` (invalid path) — fixed to `@workspace/db`.

## Admin gastos POST was unsafe
Was spreading `...req.body` directly into DB insert. Fixed to explicitly extract only valid column names.
