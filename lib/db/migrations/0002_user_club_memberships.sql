-- Migration 0002: User Club Memberships
-- Adds user_id, status, created_at, updated_at to memberships table
-- Makes player_id nullable to support club admins without a player ficha
-- Backfills memberships from users.club_id, is_club_admin, and player_id
-- Enforces uniqueness per (user_id, club_id) and prevents duplicate player ficha claiming

ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "user_id" varchar;
ALTER TABLE "memberships" ALTER COLUMN "player_id" DROP NOT NULL;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Clean up any unlinked legacy demo rows
DELETE FROM "memberships" WHERE "user_id" IS NULL;

-- Create unique index first so ON CONFLICT works properly
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_club_membership" 
ON "memberships" ("user_id", "club_id");

-- Backfill from users table where club_id is set
INSERT INTO "memberships" ("user_id", "club_id", "role", "player_id", "status", "created_at", "updated_at")
SELECT 
  u.id, 
  u.club_id, 
  CASE WHEN u.is_club_admin >= 1 THEN 'club_admin' ELSE 'player' END, 
  u.player_id, 
  'active',
  NOW(),
  NOW()
FROM "users" u
WHERE u.club_id IS NOT NULL
ON CONFLICT ("user_id", "club_id") DO UPDATE SET
  "role" = EXCLUDED.role,
  "player_id" = COALESCE(EXCLUDED.player_id, "memberships"."player_id"),
  "status" = 'active',
  "updated_at" = NOW();

-- Enforce NOT NULL on user_id now that backfill is complete
ALTER TABLE "memberships" ALTER COLUMN "user_id" SET NOT NULL;

-- Add foreign key constraint to users(id) if not present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memberships_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "memberships" 
    ADD CONSTRAINT "memberships_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Prevent claiming the same player profile by multiple users in the same club
CREATE UNIQUE INDEX IF NOT EXISTS "unique_club_player_membership" 
ON "memberships" ("club_id", "player_id") 
WHERE "player_id" IS NOT NULL;
