-- Migration 0003: Fix Membership Player Club Isolation & Normalize Roles
-- Incremental and idempotent migration to repair databases where 0002 has already executed.
-- 1. Cleans cross-club player ficha references in memberships without reassigning players across clubs.
-- 2. Normalizes legacy club roles (admin -> club_admin, etc.) without granting Super Admin privileges.
-- 3. Cleans mismatched player_id references in users table where player.club_id != user.club_id.
-- 4. Guarantees deduplication without creating duplicate memberships or reassigning player profiles.

-- Step 1: Disconnect any player ficha linked to a membership of a different club (or non-existent player)
-- Never reassigns players to different clubs; safely disassociates the ficha (sets player_id to NULL).
UPDATE "memberships" m
SET "player_id" = NULL,
    "updated_at" = NOW()
WHERE m."player_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM "players" p 
    WHERE p."id" = m."player_id" 
      AND p."club_id" = m."club_id"
  );

-- Step 2: In users table, disassociate player_id if the player's club_id does not match user's club_id
UPDATE "users" u
SET "player_id" = NULL,
    "updated_at" = NOW()
WHERE u."player_id" IS NOT NULL
  AND u."club_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM "players" p 
    WHERE p."id" = u."player_id" 
      AND p."club_id" = u."club_id"
  );

-- Step 3: Normalize legacy club membership roles to allowed roles ('club_admin' or 'player')
UPDATE "memberships"
SET "role" = 'club_admin',
    "updated_at" = NOW()
WHERE "role" IN ('admin', 'adminclub', 'colaborador', 'staff');

UPDATE "memberships"
SET "role" = 'player',
    "updated_at" = NOW()
WHERE "role" NOT IN ('club_admin', 'player');

-- Step 4: Ensure membership status is strictly 'active' or 'inactive'
UPDATE "memberships"
SET "status" = 'active',
    "updated_at" = NOW()
WHERE "status" NOT IN ('active', 'inactive');

-- Step 5: Resolve any duplicate (club_id, player_id) memberships by retaining only the newest one
WITH ranked_player_memberships AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY club_id, player_id 
      ORDER BY 
        CASE WHEN status = 'active' THEN 0 ELSE 1 END,
        updated_at DESC, 
        id DESC
    ) AS rn
  FROM "memberships"
  WHERE "player_id" IS NOT NULL
)
UPDATE "memberships" m
SET "player_id" = NULL,
    "updated_at" = NOW()
FROM ranked_player_memberships r
WHERE m."id" = r."id" AND r.rn > 1;

-- Step 6: Ensure indices exist for idempotent enforcement
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_club_membership" 
ON "memberships" ("user_id", "club_id");

CREATE UNIQUE INDEX IF NOT EXISTS "unique_club_player_membership" 
ON "memberships" ("club_id", "player_id") 
WHERE "player_id" IS NOT NULL;
