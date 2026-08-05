import { db, sportsTable } from "@workspace/db";

const INITIAL_SPORTS = [
  {
    name: "Pádel",
    slug: "padel",
    teamSize: 2,
    minTeamSize: 2,
    maxTeamSize: 2,
    useSets: true,
    active: true,
  },
  {
    name: "Tenis",
    slug: "tenis",
    teamSize: 1,
    minTeamSize: 1,
    maxTeamSize: 2,
    useSets: true,
    active: true,
  },
  {
    name: "Fútbol",
    slug: "futbol",
    teamSize: 5,
    minTeamSize: 4,
    maxTeamSize: 7,
    useSets: false,
    active: true,
  },
] as const;

/**
 * Inserts the default sports (Pádel, Tenis, Fútbol) if the table is empty.
 * Safe to call on every startup — completely idempotent:
 *   - If rows already exist → does nothing.
 *   - If partially seeded → onConflictDoNothing on slug prevents duplicates.
 */
export async function seedSports(): Promise<void> {
  const existing = await db.select({ id: sportsTable.id }).from(sportsTable).limit(1);

  if (existing.length > 0) {
    return;
  }

  await db
    .insert(sportsTable)
    .values(INITIAL_SPORTS.map((s) => ({ ...s })))
    .onConflictDoNothing({ target: sportsTable.slug });
}
