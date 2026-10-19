import { eq, and } from "drizzle-orm";
import { db, sportsTable, sportModalitiesTable, clubsTable, clubSportsTable } from "@workspace/db";

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
    teamSize: 11,
    minTeamSize: 5,
    maxTeamSize: 11,
    useSets: false,
    active: true,
  },
] as const;

const MODALITIES_BY_SPORT_SLUG: Record<
  string,
  Array<{
    name: string;
    slug: string;
    teamSize: number;
    minTeamSize: number;
    maxTeamSize: number;
    useSets: boolean;
    active: boolean;
  }>
> = {
  padel: [
    {
      name: "Dobles",
      slug: "dobles",
      teamSize: 2,
      minTeamSize: 2,
      maxTeamSize: 2,
      useSets: true,
      active: true,
    },
    {
      name: "Individual",
      slug: "individual",
      teamSize: 1,
      minTeamSize: 1,
      maxTeamSize: 1,
      useSets: true,
      active: true,
    },
  ],
  tenis: [
    {
      name: "Singles",
      slug: "singles",
      teamSize: 1,
      minTeamSize: 1,
      maxTeamSize: 1,
      useSets: true,
      active: true,
    },
    {
      name: "Dobles",
      slug: "dobles",
      teamSize: 2,
      minTeamSize: 2,
      maxTeamSize: 2,
      useSets: true,
      active: true,
    },
  ],
  futbol: [
    {
      name: "Fútbol 11",
      slug: "futbol-11",
      teamSize: 11,
      minTeamSize: 7,
      maxTeamSize: 11,
      useSets: false,
      active: true,
    },
    {
      name: "Fútbol 7",
      slug: "futbol-7",
      teamSize: 7,
      minTeamSize: 5,
      maxTeamSize: 7,
      useSets: false,
      active: true,
    },
    {
      name: "Futbolito",
      slug: "futbolito",
      teamSize: 8,
      minTeamSize: 6,
      maxTeamSize: 8,
      useSets: false,
      active: true,
    },
    {
      name: "Baby Fútbol / Futsal",
      slug: "baby-futbol",
      teamSize: 5,
      minTeamSize: 4,
      maxTeamSize: 5,
      useSets: false,
      active: true,
    },
  ],
};

/**
 * Inserts the default sports and all their modalities if missing.
 * Completely idempotent.
 */
export async function seedSports(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return;
  }

  // 1. Ensure sports exist
  for (const sport of INITIAL_SPORTS) {
    const [existing] = await db
      .select({ id: sportsTable.id })
      .from(sportsTable)
      .where(eq(sportsTable.slug, sport.slug));

    if (!existing) {
      await db.insert(sportsTable).values({ ...sport }).onConflictDoNothing();
    } else {
      // Update teamSize for fútbol if needed
      await db
        .update(sportsTable)
        .set({ teamSize: sport.teamSize, minTeamSize: sport.minTeamSize, maxTeamSize: sport.maxTeamSize })
        .where(eq(sportsTable.slug, sport.slug));
    }
  }

  // 2. Fetch all sports and ensure modalities exist
  const allSports = await db.select().from(sportsTable);

  for (const sport of allSports) {
    const modalitiesForSport = MODALITIES_BY_SPORT_SLUG[sport.slug];
    if (!modalitiesForSport) continue;

    for (const modality of modalitiesForSport) {
      await db
        .insert(sportModalitiesTable)
        .values({
          sportId: sport.id,
          name: modality.name,
          slug: modality.slug,
          teamSize: modality.teamSize,
          minTeamSize: modality.minTeamSize,
          maxTeamSize: modality.maxTeamSize,
          useSets: modality.useSets,
          active: modality.active,
        })
        .onConflictDoNothing({
          target: [sportModalitiesTable.sportId, sportModalitiesTable.slug],
        });
    }
  }

  // 3. Ensure fútbol is active for all clubs in clubSportsTable
  const futbolSport = allSports.find((s) => s.slug === "futbol");
  if (futbolSport) {
    try {
      const clubs = await db.select({ id: clubsTable.id }).from(clubsTable);
      for (const club of clubs) {
        const [existing] = await db
          .select({ id: clubSportsTable.id })
          .from(clubSportsTable)
          .where(
            and(
              eq(clubSportsTable.clubId, club.id),
              eq(clubSportsTable.sportId, futbolSport.id)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(clubSportsTable).values({
            clubId: club.id,
            sportId: futbolSport.id,
            active: club.id === 3 || club.id === 4,
          });
        }
      }
    } catch (err: any) {
      console.warn("Could not seed clubSportsTable for futbol:", err?.message);
    }
  }
}

